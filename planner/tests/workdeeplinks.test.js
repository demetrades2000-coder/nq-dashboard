// Every deep link opens without a page error and without sideways scroll at 390 px: node planner/tests/workdeeplinks.test.js (PORT env, default 8785)
process.env.PORT = process.env.PORT || '8785';
const { chromium } = require('playwright');
const { wait, open } = require('./lib-fin');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime();
  const links = ['today', 'plan', 'shifts', 'bills', 'tilt', 'trade-plan', 'search', 'time-audit', 'timer', 'deals', 'edge', 'score', 'worth', 'alerts', 'miles', 'brief', 'payday', 'hours', 'availability'];
  for (const l of links) {
    const { ctx, p, errs: pe } = await open(b, { now, hash: '#' + l });
    await wait(300);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(w <= 390, `#${l}: no sideways scroll (${w})`);
    pe.forEach((e) => errs.push(`#${l}: ${e}`));
    if (['payday', 'hours', 'availability'].includes(l)) ok(await p.locator({ payday: '#pdDlg', hours: '#hrDlg', availability: '#avDlg' }[l]).isVisible(), `#${l} opens its sheet`);
    await ctx.close();
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('DEEP LINKS OK');
})();
