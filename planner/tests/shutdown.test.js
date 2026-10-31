// Close out the day card: node planner/tests/shutdown.test.js (serve on 127.0.0.1:8777)
const { chromium } = require('playwright');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-04T20:00:00'));
  await p.goto('http://127.0.0.1:8777/nq-dashboard/planner/index.html#today'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1') || '{}'); s.tasks = [{ id: 'a', title: 'Call Sam', date: '2026-11-04', done: false, created: 1 }, { id: 'b', title: 'Old thing', date: '2026-11-02', done: false, created: 2 }, { id: 'c', title: 'Done', date: '2026-11-04', done: true, created: 3 }]; s.events = [{ id: 'e', title: 'Outback', cat: 'trading', date: '2026-11-05', start: '16:00', end: '22:00', allDay: false, repeat: 'none', ex: [], created: 1 }]; localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.isVisible('#sdCard'), 'card shows in the evening');
  const t = await p.textContent('#sdCard'); ok(/2 still open|2 open/.test(t) && /Outback/.test(t) && /4pm/.test(t), t);
  await p.click('[data-sdmove]'); await p.waitForTimeout(300);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).tasks.filter((x) => !x.done).map((x) => x.date));
  ok(d.length === 2 && d.every((x) => x === '2026-11-05'), 'moved: ' + d);
  await p.fill('#sdWin', 'Closed a strong shift'); await p.press('#sdWin', 'Enter'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).journal.some((j) => j.date === '2026-11-04' && j.win === 'Closed a strong shift')), 'win saved');
  await p.clock.setFixedTime(new Date('2026-11-04T10:00:00')); await p.reload(); await p.waitForTimeout(1200);
  ok(!(await p.isVisible('#sdCard')), 'hidden in the morning');
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('SHUTDOWN OK');
})();
