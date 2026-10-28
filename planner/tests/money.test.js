const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.goto(URL); await wait(5000);
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1') || '{}'));
  await p.click('#views [data-v=projects]'); await wait(200);
  ok(await p.locator('.gm .card').count() === 2, 'goals + money panels');
  // manual goal
  await p.click('[data-gnew]'); await p.fill('#gTitle', 'First $1,000 payout'); await p.fill('#gTarget', '1,000'); await p.fill('#gCur', '250'); await p.fill('#gDue', '2026-12-31'); await p.click('#goalForm button[type=submit]'); await wait(300);
  ok(/First \$1,000 payout/.test(await p.textContent('.goal')) && /\$250 of \$1,000/.test(await p.textContent('.goal')) && /25%/.test(await p.textContent('.goal')), 'manual goal shown: ' + await p.textContent('.goal'));
  // auto goal from bots
  await p.click('[data-gnew]'); await p.fill('#gTitle', 'Green month'); await p.selectOption('#gKind', 'month_pnl'); await p.fill('#gTarget', '500'); await p.click('#goalForm button[type=submit]'); await wait(300);
  ok(await p.locator('.goal').count() === 2 && /live from the bots/.test(await p.textContent('.gm')), 'auto goal');
  // validation
  await p.click('[data-gnew]'); await p.click('#goalForm button[type=submit]'); ok(await p.isVisible('#gErr'), 'goal validation'); await p.keyboard.press('Escape');
  // money
  await p.click('[data-mnew]'); await p.fill('#mAmt', '91.80'); await p.click('#mKind [data-k=out]'); await p.fill('#mNote', 'Eval fee 50K'); await p.selectOption('#mProj', 'nq'); await p.click('#moneyForm button[type=submit]'); await wait(300);
  await p.click('[data-mnew]'); await p.fill('#mAmt', '1,250.50'); await p.fill('#mNote', 'Payout'); await p.click('#moneyForm button[type=submit]'); await wait(300);
  const txt = await p.textContent('.gm .card:nth-child(2)');
  ok(/\$1,250\.50/.test(txt) && /\$91\.80/.test(txt) && /\$1,158\.70/.test(txt), 'money totals: ' + txt.replace(/\s+/g, ' ').slice(0, 300));
  ok((await st()).money.length === 2, 'saved 2 entries');
  // edit + delete entry
  await p.click('[data-medit] >> nth=0'); await p.fill('#mAmt', '1300'); await p.click('#moneyForm button[type=submit]'); await wait(300);
  ok(/\$1,300\.00/.test(await p.textContent('.gm')), 'edited');
  await p.click('[data-medit] >> nth=1'); await p.click('#mDelete'); await wait(300); ok((await st()).money.length === 1, 'deleted');
  await p.click('#toastBtn'); await wait(300); ok((await st()).money.length === 2, 'undo delete');
  // persistence and phone layout
  await p.reload(); await wait(1500); await p.click('#views [data-v=projects]');
  ok(await p.locator('.goal').count() === 2 && await p.locator('.m-row').count() === 2, 'persisted');
  await p.screenshot({ path: 'shots/M-desktop.png' });
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); m.on('pageerror', (e) => errs.push('m ' + e.message));
  await m.goto(URL); await wait(1500);
  await m.evaluate((s) => localStorage.setItem('planner.v1', s), JSON.stringify(await st())); await m.reload(); await wait(1500); await m.click('#views [data-v=projects]'); await wait(300);
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'phone overflow');
  await m.screenshot({ path: 'shots/M-phone.png' });
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'MONEY OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
