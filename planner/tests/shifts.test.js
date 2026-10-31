// Work shifts: node planner/tests/shifts.test.js  (serve the site on 127.0.0.1:8777 first, see lead.test.js)
const { chromium } = require('playwright');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:8777/nq-dashboard/planner/index.html#shifts'); await wait(2500);
  ok(await p.isVisible('#shDlg'), '#shifts opens the sheet');
  ok(/Outback Steakhouse/.test(await p.textContent('#shJobs')) && /Electric/.test(await p.textContent('#shJobs')), 'both jobs are there');
  // Outback: Fri, Sat, Sun, 4 pm - 10 pm at $5/h, 4 weeks
  await p.fill('#shRate', '5'); await p.click('[data-shp="none"]');
  for (const d of [5, 6, 0]) await p.click(`[data-sd="${d}"]`);
  await p.selectOption('#shFor', '4');
  ok(/18 h\/week/.test(await p.textContent('#shSum')) && /\$90\/week/.test(await p.textContent('#shSum')), 'summary: ' + await p.textContent('#shSum'));
  await p.click('#shAdd'); await wait(300);
  const ev = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).events.filter((e) => e.cat === 'job-outback'));
  ok(ev.length === 3 && ev.every((e) => e.repeat === 'weekly' && e.start === '16:00' && e.end === '22:00' && e.until), '3 weekly shifts: ' + JSON.stringify(ev.map((e) => [e.date, e.until])));
  ok(new Set(ev.map((e) => new Date(e.date + 'T12:00').getDay())).size === 3, 'three different weekdays');
  await p.click('#shAdd'); await wait(200);
  const again = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).events.filter((e) => e.cat === 'job-outback').length);
  ok(again === 3, 'adding twice makes no duplicates: ' + again);
  // electric: weekdays, once
  await p.click('[data-sj="job-electric"]'); await p.click('[data-shp="wk"]'); await p.selectOption('#shFor', '1'); await p.click('#shAdd'); await wait(300);
  const el = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).events.filter((e) => e.cat === 'job-electric'));
  ok(el.length === 5 && el.every((e) => e.repeat === 'none'), 'electric: 5 one-week shifts ' + el.length);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
  ok(st.categories.some((c) => c.id === 'job-outback' && c.name === 'Outback Steakhouse') && st.jobs.find((j) => j.id === 'job-outback').rate === 5 && st.jobs.find((j) => j.id === 'job-outback').days.length === 3, 'job + type saved with the rate and days');
  await p.click('#shDlg [data-close]'); ok(!(await p.isVisible('#shDlg')), 'closes');
  await p.click('#newBtn'); ok(/Outback/.test(await p.textContent('#fCats')), 'job shows as an event type'); await p.keyboard.press('Escape');
  await p.keyboard.press('s'); await wait(200); ok(await p.isVisible('#shDlg'), 'S key opens it');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await p.screenshot({ path: '/tmp/shifts.png' });
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('SHIFTS OK');
})();
