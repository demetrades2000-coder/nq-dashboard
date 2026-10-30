// Earnings board: node planner/tests/earn.test.js  (serve the site on 127.0.0.1:8777 first, see shifts.test.js; PORT=... overrides)
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })); // keep the bot P&L deterministic
  await p.goto(URL); await wait(1500);
  // seed: Outback $10/h, a weekly 6 h Friday shift from this week's Friday (so $60/week), money in $100 and out $30 today, bot P&L +$200 today
  const exp = await p.evaluate(() => {
    const pad = (n) => String(n).padStart(2, '0'), key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date(), t = new Date(now); t.setDate(t.getDate() - t.getDay());
    const fri = new Date(t); fri.setDate(fri.getDate() + 5);
    const s = JSON.parse(localStorage.getItem('planner.v1')) || {};
    s.jobs = [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 10, days: [5] }, { id: 'job-electric', name: 'Electric', color: '#ca8a04', start: '07:00', end: '15:30', rate: 0, days: [] }];
    s.events = [{ id: 'sh', title: 'Outback Steakhouse', cat: 'job-outback', date: key(fri), allDay: false, start: '16:00', end: '22:00', endDate: '', repeat: 'weekly', until: '', notes: '', proj: '', ex: [], created: 1 }];
    s.money = [{ id: 'm1', kind: 'in', amt: 100, date: key(now), note: 'sponsor', created: 1 }, { id: 'm2', kind: 'out', amt: 30, date: key(now), note: 'fee', created: 2 }];
    s.incomegoal = []; s.view = 'today'; s.weekStart = 0;
    localStorage.setItem('planner.v1', JSON.stringify(s));
    const nq = JSON.parse(localStorage.getItem('planner.nq') || '{}'); nq.pnl = { ...(nq.pnl || {}), [key(now)]: 200 }; localStorage.setItem('planner.nq', JSON.stringify(nq));
    // Fridays (on/after the first Friday occurrence) in the current month, and how many are already worked (before today)
    let n = 0, done = 0;
    for (let d = new Date(now.getFullYear(), now.getMonth(), 1); d.getMonth() === now.getMonth(); d.setDate(d.getDate() + 1)) if (d.getDay() === 5 && key(d) >= key(fri)) { n++; if (key(d) < key(now)) done++; }
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { fridays: n, done, today: key(now), daysLeft: last.getDate() - now.getDate() + 1 };
  });
  await p.reload(); await wait(1500);
  await expand(p, 'earn'); ok(await p.isVisible('#erCard'), 'Earnings card is on Today');
  // week: $60 shift + $200 trading + $100 money in = $360 (a week that straddles a month still has the whole Friday shift in the week)
  ok(/\$360/.test(await p.textContent('#erCard')), 'card shows $360 this week: ' + await p.textContent('#erCard'));
  await expand(p, 'earn'); await p.click('#erCard [data-eropen]'); await wait(200);
  ok(await p.isVisible('#erDlg'), 'sheet opens');
  const t = await p.textContent('#erTable');
  ok(/Shifts/.test(t) && /Trading/.test(t) && /Money log/.test(t), 'split by source: ' + t);
  ok(/Outback Steakhouse \(6 h/.test(t) && /at \$10\/h/.test(t), 'per-job line with hours and rate');
  ok((await p.textContent('#erWeek')).trim() === '$360', 'week total $360: ' + await p.textContent('#erWeek'));
  const monthTotal = exp.fridays * 60 + 200 + 100;
  ok((await p.textContent('#erMonth')).trim() === '$' + monthTotal, `month total $${monthTotal}: ` + await p.textContent('#erMonth'));
  ok(/\$30 logged as money out/.test(await p.textContent('#erNote')) && /before tax/.test(await p.textContent('#erNote')), 'estimate/pre-tax label, expenses not subtracted');
  ok(/Electric has no hourly rate|no hourly rate/.test(await p.textContent('#erDlg')) === false, 'unused Electric job does not nag about a rate');
  // goal
  const fs = await p.evaluate(() => getComputedStyle(document.querySelector('#erGoalIn')).fontSize); ok(parseFloat(fs) >= 16, 'goal input 16px ' + fs);
  ok(!(await p.isVisible('#erNeed')), 'no progress before a goal is set');
  await p.fill('#erGoalIn', '2000'); await p.press('#erGoalIn', 'Tab'); await wait(300);
  const g = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).incomegoal);
  ok(g.length === 1 && g[0].amt === 2000 && g[0].u, 'goal saved and stamped for sync: ' + JSON.stringify(g));
  ok(await p.isVisible('#erProg') && await p.isVisible('#erNeed'), 'progress bar and needed-per-week show');
  const need = await p.textContent('#erNeed');
  ok(/Still to make: \$/.test(need) && /(a week|in the last)/.test(need), 'needed per week: ' + need);
  ok(/goal/.test(await p.textContent('#erProg')) && /\$2,000/.test(await p.textContent('#erProg')), 'progress line');
  await p.screenshot({ path: '/tmp/earn.png' });
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await p.click('#erDlg [data-close]'); ok(!(await p.isVisible('#erDlg')), 'closes'); await wait(600);
  ok(/%/.test(await p.textContent('#erCard')), 'card shows % of goal after closing: ' + (await p.textContent('#erCard')).replace(/\s+/g,' '));
  // a goal already met
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); s.incomegoal = [{ id: 'month', amt: 50, u: Date.now() }]; localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(1500); await expand(p, 'earn'); await p.click('#erCard [data-eropen]');
  ok(/Goal reached/.test(await p.textContent('#erNeed')), 'goal reached message');
  await p.click('#erDlg [data-close]');
  await p.goto(URL + '#earnings'); await wait(1500); ok(await p.isVisible('#erDlg'), '#earnings deep link opens it');
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('EARN OK');
})();
