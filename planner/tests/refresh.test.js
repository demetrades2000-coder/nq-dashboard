const { chromium } = require('playwright');
const expand = require('./lib-expand');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await wait(5500);
  ok(/days? old|h old/.test(await p.textContent('.tdy')), 'stale chip on Today: ' + (await p.textContent('.tdy')).slice(0, 0));
  const t0 = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.nq')).t);
  await wait(50); await expand(p, 'trading'); await p.click('.tdy [data-refresh]'); await wait(5000);
  const t1 = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.nq')).t);
  ok(t1 > t0, 'refresh refetched data'); ok(/newest|updated/.test(await p.textContent('#toastMsg')), 'toast: ' + await p.textContent('#toastMsg'));
  await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await wait(200);
  ok(await p.evaluate(() => document.body.classList.contains('offline')), 'offline class');
  await expand(p, 'trading'); await p.click('.tdy [data-refresh]'); await wait(1500); ok(/Could not reach/.test(await p.textContent('#toastMsg')), 'offline refresh message: ' + await p.textContent('#toastMsg'));
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'REFRESH OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
