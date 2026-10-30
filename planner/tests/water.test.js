// One-tap water in ounces. node planner/tests/water.test.js (PORT default 8777)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.clock.setFixedTime(new Date('2026-11-04T12:30:00'));
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).water || []);
  await p.goto(URL + '#today'); await wait(1500);
  ok(await p.isVisible('#waStrip'), 'water strip on Today');
  const y = await p.evaluate(() => { const r = document.querySelector('#waStrip').getBoundingClientRect(); const h = document.querySelector('.tdy .td-h').getBoundingClientRect(); return [r.top - h.bottom, r.top]; });
  ok(y[0] >= 0 && y[0] < 40, 'strip sits right under the date header ' + y);
  ok(/0 oz/.test(await p.textContent('#waStrip')) && /100/.test(await p.textContent('#waStrip')), 'starts at 0 of 100: ' + (await p.textContent('#waStrip')).replace(/\s+/g, ' '));
  await p.click('#waStrip [data-waadd="16"]'); await wait(300);
  ok(/16 oz/.test(await p.textContent('#waStrip')), 'one tap adds 16 oz');
  await p.click('#waStrip [data-waadd="8"]'); await p.click('#waStrip [data-waadd="24"]'); await wait(300);
  ok((await st()).filter((x) => x.id !== 'cfg').reduce((a, x) => a + x.oz, 0) === 48 && /48 oz/.test(await p.textContent('#waStrip')), 'adds up to 48');
  // undo
  await p.click('#toastBtn'); await wait(300);
  ok(/24 oz/.test(await p.textContent('#waStrip')), 'undo removes the last add: ' + (await p.textContent('#waStrip')).replace(/\s+/g, ' ').slice(0, 40));
  // sheet, custom, delete
  await p.click('#waStrip [data-waopen]'); await wait(300);
  ok(await p.isVisible('#waDlg') && (await p.$$('#waBody .wa-row')).length === 2, 'sheet lists today\'s drinks');
  await p.fill('#waCustom', '12'); await p.click('#waCustomGo'); await wait(300);
  ok((await p.$$('#waBody .wa-row')).length === 3 && /36 oz/.test(await p.textContent('.wa-big')), 'custom amount added: ' + (await p.textContent('.wa-big')).replace(/\s+/g, ' '));
  await p.click('#waBody [data-wadel]'); await wait(300); ok((await p.$$('#waBody .wa-row')).length === 2, 'delete a drink');
  // settings
  await p.evaluate(() => { document.querySelector('#waDlg .ml-more').open = true; });
  await p.fill('#waGoal', '64'); await p.fill('#waS1', '10'); await p.press('#waS1', 'Tab'); await wait(300);
  const cfg = (await st()).find((x) => x.id === 'cfg'); ok(cfg && cfg.goal === 64 && cfg.sizes[0] === 10, 'goal and buttons saved ' + JSON.stringify(cfg));
  await p.click('#waDlg [data-close]'); await wait(200);
  ok(/of 64|of 64|goal 64|to go/.test(await p.textContent('#waStrip')) && await p.isVisible('#waStrip [data-waadd="10"]'), 'strip uses the new goal and button');
  // goal reached message
  await p.click('#waStrip [data-waadd="24"]'); await p.click('#waStrip [data-waadd="24"]'); await wait(300);
  ok(/Goal reached/.test(await p.textContent('#waStrip')), 'goal reached state');
  // survives reload, deep link, no overflow, 44px-ish tap targets, 16px inputs
  await p.goto(URL + '#water'); await wait(1200); ok(await p.isVisible('#waDlg'), '#water deep link');
  const small = await p.evaluate(() => [...document.querySelectorAll('#waDlg input')].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id)); ok(!small.length, 'inputs under 16px ' + small);
  await p.click('#waDlg [data-close]');
  const bh = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#waStrip [data-waadd]')].map((e) => e.getBoundingClientRect().height))); ok(bh >= 38, 'tap targets tall enough ' + bh);
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('WATER OK');
})();
