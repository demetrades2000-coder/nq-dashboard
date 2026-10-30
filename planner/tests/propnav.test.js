// Deep links and phone width for the prop, business and tax features: node planner/tests/propnav.test.js  (PORT env, default 8786)
process.env.PORT = process.env.PORT || '8786';
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, open } = require('./lib-fin');
const NOW = Date.parse('2026-09-01T15:10:00Z'); // 14 days before the Q3 estimated-tax date
const fee = (id, kind, amt, date) => ({ id, kind, amt, date, mid: '' });
const state = {
  propacct: [{ id: 'pa1', firm: 'MFFU', name: '50K Builder with a very long account name to test wrapping on a phone', size: 50000, start: '2026-08-01', end: '2026-08-20', status: 'paid', split: 90, acct: '', proj: 'nq', fees: [fee('f1', 'eval', 107, '2026-08-01')], pays: [{ id: 'p1', amt: 1500, date: '2026-08-28', mid: '' }] }],
  money: [{ id: 'a', created: 1, kind: 'in', amt: 3000, date: '2026-07-10', proj: 'clipper', note: 'Client' }, { id: 'b', created: 2, kind: 'out', amt: 500, date: '2026-07-12', proj: 'clipper', note: 'Ads' }, { id: 'c', created: 3, kind: 'in', amt: 80, date: '2026-08-12', proj: '', note: 'misc' }],
};
const hashes = ['today', 'plan', 'shifts', 'bills', 'tilt', 'trade-plan', 'search', 'time-audit', 'timer', 'deals', 'edge', 'score', 'worth', 'alerts', 'miles', 'brief', 'prop', 'business', 'taxes'];
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const c = nqCache(NOW, {}); c.doc.trade.accounts = [{ name: 'MFFU 50K Builder', strategy: 'LIT', stage: 'eval', status: 'open', profit: 800, target: 3000, sessions_left: 6 }];
  for (const h of hashes) {
    const { p, errs: pe } = await open(b, { now: NOW, seed: c, state, hash: '#' + h });
    await wait(300);
    if (pe.length) errs.push(`#${h}: page errors ${pe.join(' | ')}`);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(w <= 390, `#${h}: sideways scroll ${w}`);
    await p.context().close();
  }
  // the three Today cards at phone width
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: c, state });
    for (const id of ['#ppCard', '#bzCard', '#tqCard']) await expand.within(p, id);
    for (const id of ['#ppCard', '#bzCard', '#tqCard']) ok(await p.locator(`.tdy ${id}`).count() === 1 && await p.isVisible(id), `Today has ${id}`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'Today has no sideways scroll');
    await p.screenshot({ path: '/tmp/propnav-today.png', fullPage: true });
    // every dialog stays inside the phone width with its content open
    for (const [btn, dlg] of [['[data-ppopen]', '#ppDlg'], ['[data-bzopen]', '#bzDlg'], ['[data-tqopen]', '#tqDlg']]) {
      await expand(p, ({ '[data-ppopen]': 'prop', '[data-bzopen]': 'biz', '[data-tqopen]': 'tax' })[btn]); await p.click(btn); await wait(250);
      const r = await p.evaluate((d) => { const el = document.querySelector(d + ' .dlg'), q = el.getBoundingClientRect(); return { r: q.right, sw: el.scrollWidth, cw: el.clientWidth }; }, dlg);
      ok(r.r <= 391 && r.sw <= r.cw + 1, `${dlg} fits 390px: ${JSON.stringify(r)}`);
      await p.keyboard.press('Escape'); await wait(200);
    }
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('PROPNAV OK');
})();
