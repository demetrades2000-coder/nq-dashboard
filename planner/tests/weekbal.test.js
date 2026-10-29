// Week balance: node planner/tests/weekbal.test.js  (serve the site on 127.0.0.1:8777 first, see shifts.test.js)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await wait(1500);
  // seed one week (Sunday start): trading 3 h Mon, personal 2 h Tue, weekly 6 h Outback shift on Fri, an all-day event
  await p.evaluate(() => {
    const pad = (n) => String(n).padStart(2, '0'), key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const t = new Date(); t.setDate(t.getDate() - t.getDay()); const day = (i) => { const d = new Date(t); d.setDate(d.getDate() + i); return key(d); };
    const s = JSON.parse(localStorage.getItem('planner.v1')) || {};
    const ev = (id, cat, date, start, end, more) => ({ id, title: id, cat, date, allDay: false, start, end, endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [], created: 1, ...more });
    s.events = [ev('a', 'trading', day(1), '09:00', '12:00'), ev('b', 'personal', day(2), '10:00', '12:00'), ev('c', 'job-outback', day(5), '16:00', '22:00', { repeat: 'weekly' }), ev('d', 'personal', day(3), '', '', { allDay: true })];
    s.budgets = []; s.view = 'today'; s.weekStart = 0;
    localStorage.setItem('planner.v1', JSON.stringify(s));
  });
  await p.reload(); await wait(1500);
  ok(await p.isVisible('#wbCard'), 'Week balance card is on Today');
  ok(/11 h/.test(await p.textContent('#wbCard')) && /planned this week/.test(await p.textContent('#wbCard')), 'card: 11 h planned: ' + (await p.textContent('#wbCard')));
  await p.click('#wbCard [data-wbopen]'); await wait(200);
  ok(await p.isVisible('#wbDlg'), 'sheet opens');
  const tiles = await p.textContent('#wbTiles');
  ok(/11 h/.test(tiles) && /101 h/.test(tiles), 'planned 11 h, free 101 h (112 awake - 11): ' + tiles);
  ok(/8 h of sleep/.test(await p.textContent('#wbNote')), 'sleep assumption stated');
  ok(/Trading/.test(await p.textContent('[data-wbid="trading"]')) && /3 h/.test(await p.textContent('[data-wbid="trading"]')), 'trading 3 h');
  ok(/6 h/.test(await p.textContent('[data-wbid="job-outback"]')) && /Outback/.test(await p.textContent('[data-wbid="job-outback"]')), 'shift row 6 h named after the job');
  ok(/2 h/.test(await p.textContent('[data-wbid="personal"]')), 'all-day event skipped (personal stays 2 h)');
  // targets
  await p.click('#wbSet'); await wait(150);
  const fs = await p.evaluate(() => [...document.querySelectorAll('#wbDlg [data-wbt]')].map((i) => getComputedStyle(i).fontSize));
  ok(fs.length >= 8 && fs.every((f) => parseFloat(f) >= 16), 'target inputs are 16px: ' + fs.join());
  await p.fill('[data-wbt="trading"]', '2'); await p.fill('[data-wbt="personal"]', '4'); await p.fill('[data-wbt="job-outback"]', '6');
  await p.click('#wbSave'); await wait(300);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).budgets);
  ok(st.length === 3 && st.find((x) => x.id === 'trading').hours === 2 && st.every((x) => x.u), 'budgets saved and stamped for sync: ' + JSON.stringify(st));
  ok(/1 h over/.test(await p.textContent('[data-wbid="trading"]')), 'trading flagged 1 h over');
  ok(/2 h under/.test(await p.textContent('[data-wbid="personal"]')), 'personal flagged 2 h under');
  ok(/On target/.test(await p.textContent('[data-wbid="job-outback"]')), 'outback on target');
  ok(/12 h/.test(await p.textContent('#wbTiles')), 'targets total 12 h');
  ok(/1 type is over/.test(await p.textContent('#wbNote')), 'over count in note');
  // next week: only the weekly shift
  await p.click('[data-wbnav="1"]'); await wait(150);
  ok(/^\s*6 h/.test(await p.textContent('#wbTiles')) && /106 h/.test(await p.textContent('#wbTiles')), 'next week: 6 h planned, 106 free: ' + await p.textContent('#wbTiles'));
  ok(!/This week:/.test(await p.textContent('#wbLabel')), 'label is not "This week"');
  await p.click('[data-wbnav="0"]'); ok(/This week:/.test(await p.textContent('#wbLabel')), 'This week button returns');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await p.screenshot({ path: '/tmp/weekbal.png' });
  // clearing a target removes it
  await p.click('#wbSet'); await p.fill('[data-wbt="trading"]', ''); await p.click('#wbSave'); await wait(200);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).budgets.length) === 2, 'blank target removes the budget');
  await p.click('#wbDlg [data-close]'); ok(!(await p.isVisible('#wbDlg')), 'closes');
  await p.goto(URL + '#week-balance'); await wait(1500); ok(await p.isVisible('#wbDlg'), '#week-balance deep link opens it');
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('WEEKBAL OK');
})();
