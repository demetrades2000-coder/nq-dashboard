const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { const T = Date.now(), n = new Date(); n.setHours(10, 0, 0, 0); const fixed = n.getTime(); const R = Date; window.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(fixed + (R.now() - T)); } static now() { return fixed + (R.now() - T); } }; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.goto(URL); await wait(300);
  await p.evaluate(() => { const d = new Date(), pad = (n) => String(n).padStart(2, '0'), k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; const s = { events: [
    { id: 'a', title: 'Prop call', cat: 'meetings', date: k, allDay: false, start: '10:00', end: '10:45', repeat: 'none', ex: [] },
    { id: 'b', title: 'Review fills', cat: 'trading', date: k, allDay: false, start: '13:30', end: '14:00', repeat: 'none', ex: [] }], tasks: [{ id: 't', title: 'x', date: k, done: false, created: 1 }] }; localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(1500);
  const t = await p.textContent('#nowbar'); ok(/Now: Prop call/.test(t) && /until 10:45am/.test(t), 'now: ' + t);
  ok(await p.isVisible('#nowbar [data-nowplan]'), 'plan button when not planned');
  await p.screenshot({ path: 'shots/N-phone.png', clip: { x: 0, y: 0, width: 390, height: 300 } });
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } }); await d.goto(URL); await wait(500); ok(!(await d.isVisible('#nowbar')), 'hidden on desktop');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'NOW OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
