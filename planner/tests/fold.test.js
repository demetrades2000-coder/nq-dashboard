const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await wait(5500);
  ok(await p.evaluate(() => ['trade', 'layers', 'catsCard', 'settings'].every((id) => document.getElementById(id).classList.contains('fold'))), 'fold classes');
  ok(await p.evaluate(() => document.getElementById('layers').classList.contains('collapsed')), 'layers collapsed by default');
  ok(!(await p.isVisible('#layers .lay')), 'layers body hidden'); ok(await p.isVisible('#trade .acct'), 'trade body visible');
  await p.click('#layers .sec-h h2'); ok(await p.isVisible('#layers .lay'), 'layers opens on tap');
  await p.click('#trade .sec-h h2'); ok(!(await p.isVisible('#trade .acct')), 'trade collapses');
  await p.reload(); await wait(5000);
  ok(await p.evaluate(() => document.getElementById('trade').classList.contains('collapsed') && !document.getElementById('layers').classList.contains('collapsed')), 'state remembered');
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } }); await d.goto(URL); await wait(5000);
  ok(await d.isVisible('#layers .lay') && await d.isVisible('#cats'), 'desktop ignores folding');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'FOLD OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
