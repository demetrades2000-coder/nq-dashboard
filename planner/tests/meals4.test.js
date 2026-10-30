// Real maintenance calories from food + weight. node planner/tests/meals4.test.js (PORT default 8777)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.clock.setFixedTime(new Date('2026-11-04T12:30:00'));
  await p.goto(URL + '#today'); await wait(1500);
  const seed = (withData) => p.evaluate((withData) => {
    const s = JSON.parse(localStorage.getItem('planner.v1') || '{}'); const day = (n) => { const d = new Date('2026-11-04T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    s.meals = []; s.health = [{ id: 'cfg', unit: 'kg' }]; s.foodcfg = [{ id: 'cfg', kcal: 2500, p: 150, c: 250, f: 80 }];
    if (withData) for (let i = 1; i <= 28; i++) { s.meals.push({ id: 'm' + i, date: day(i), time: '12:00', slot: 'lunch', name: 'Day ' + i, items: [], kcal: 2500, p: 150, c: 250, f: 80, created: i }); if (i % 3 === 0) s.health.push({ id: 'h:' + day(i), date: day(i), weight: 80 + (i - 28) * 0.0714 * -1 * -1 }); }
    localStorage.setItem('planner.v1', JSON.stringify(s)); }, withData);
  // weight falls 0.5 kg a week while eating 2500: maintenance is about 2500 + 0.5*7700/7 = 3050
  await seed(true); await p.reload(); await wait(1200); await p.click('#mlBtn'); await p.click('[data-mltab="trends"]'); await wait(300);
  const t = await p.textContent('#mlPaneTrends'); const m = t.match(/about ([\d,]+) kcal/);
  ok(m && Math.abs(parseInt(m[1].replace(',', ''), 10) - 3050) <= 120, 'real maintenance near 3,050: ' + (m && m[0]));
  ok(/down 0\.\d kg a week/.test(t), 'trend sentence: ' + t.replace(/\s+/g, ' ').slice(0, 200));
  await seed(false); await p.reload(); await wait(1200); await p.click('#mlBtn'); await p.click('[data-mltab="trends"]'); await wait(300);
  ok(!/real maintenance/.test(await p.textContent('#mlPaneTrends')), 'hidden without enough data');
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('MEALS4 OK');
})();
