// Paste a schedule: node planner/tests/paste.test.js (serve on 127.0.0.1:8777)
const { chromium } = require('playwright');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:8777/nq-dashboard/planner/index.html#shifts'); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector('#shPasteBox').open = true);
  await p.fill('#shPaste', 'Fri 11/6/2026 4-10pm\nSat 11/7 4pm-10pm\n2026-11-08 7am-3:30pm\nSun 11/9 11:00 - 17:00\nMon 11/10 7-3:30\nlunch with Sam\nTue 11/11 5-close');
  await p.click('#shPasteAdd'); await p.waitForTimeout(300);
  const ev = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).events.filter((e) => e.cat === 'job-outback').map((e) => e.date + ' ' + e.start + '-' + e.end));
  const want = ['2026-11-06 16:00-22:00', '2026-11-07 16:00-22:00', '2026-11-08 07:00-15:30', '2026-11-09 11:00-17:00', '2026-11-10 07:00-15:30'];
  ok(JSON.stringify(ev.sort()) === JSON.stringify(want), 'parsed: ' + JSON.stringify(ev));
  const out = await p.textContent('#shPasteOut'); ok(/Added 5/.test(out) && /Skipped 2/.test(out), out);
  await p.fill('#shPaste', 'Fri 11/6/2026 4-10pm'); await p.click('#shPasteAdd'); ok(/already there/.test(await p.textContent('#shPasteOut')), 'no duplicate');
  await p.fill('#shTip', '85.50'); await p.click('#shTipAdd');
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).money.filter((m) => m.note === 'Outback Steakhouse tips' && m.amt === 85.5).length)) === 1, 'tip logged');
  ok(/\$86 in tips/.test(await p.textContent('#shTipOut')), await p.textContent('#shTipOut'));
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('PASTE OK');
})();
