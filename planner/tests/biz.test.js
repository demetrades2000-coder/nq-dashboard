// Business P&L: node planner/tests/biz.test.js  (serve the site first, PORT env, default 8786; see shifts.test.js)
process.env.PORT = process.env.PORT || '8786';
const { chromium } = require('playwright');
const { wait, nqCache, open, st } = require('./lib-fin');
const NOW = Date.parse('2026-10-30T15:10:00Z'); // Friday 11:10 ET
let n = 0;
const m = (kind, amt, date, proj, note) => ({ id: 'm' + ++n, created: n, kind, amt, date, proj, note: note || '' });
const money = [
  m('in', 500, '2026-10-05', 'clipper', 'Client A'), m('out', 120, '2026-10-10', 'clipper', 'Editing software'), m('in', 300, '2026-09-12', 'clipper'), m('in', 100, '2026-08-03', 'clipper'), m('out', 250, '2026-08-20', 'clipper', 'Ads'), m('in', 40, '2026-06-09', 'clipper'),
  m('in', 1500, '2026-10-20', 'nq', 'Payout'), m('out', 107, '2026-10-02', 'nq', 'Eval fee'), m('out', 200, '2026-09-15', 'nq', 'Reset'),
  m('out', 30, '2026-10-11', '', 'coffee'), m('in', 80, '2026-10-12', '', 'misc'), m('out', 20, '2026-09-30', '', 'Clipper software fee'), m('out', 15, '2026-10-14', 'gone-project', 'orphan'),
];
const miles = [
  { id: 't1', kind: 'trip', date: '2026-10-08', from: 'Home', to: 'Site', job: 'Clipper', miles: 100, rate: 0.7 },
  { id: 'e1', kind: 'exp', date: '2026-10-09', cat: 'Tools', amt: 40, job: 'Clipper', mid: 'm-already' },
  { id: 'e2', kind: 'exp', date: '2026-10-10', cat: 'Tools', amt: 25, job: 'Clipper' },
];
(async () => {
  const errs = [], ok = (c, m2) => { if (!c) errs.push(m2); };
  const b = await chromium.launch();
  const txt = async (p, sel) => (await p.innerText(sel)).replace(/\s+/g, ' ');
  const W = (p) => p.evaluate(() => document.documentElement.scrollWidth);

  // ---- empty ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), hash: '#business' });
    ok(await p.isVisible('#bzDlg') && /No money entries yet/.test(await txt(p, '#bzBody')), 'opens empty with a hint');
    ok(!(await p.locator('#bzUntagBox').count()), 'no tag helper with nothing to tag');
    await p.keyboard.press('Escape'); await wait(200);
    ok(!(await p.locator('#bzCard').count()), 'no card with no money entries');
    errs.push(...pe);
  }

  // ---- numbers, chart, best and worst, miles ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), state: { money, miles } });
    const card = await txt(p, '#bzCard');
    ok(/Business profit and loss/.test(card) && /Oct net/.test(card), 'Today card: ' + card);
    ok(/\$1,773/.test(card), 'card net is tagged projects only (380 + 1393): ' + card);
    ok(/4 untagged entries not included/.test(card) && /\$1,763/.test(card), 'card mentions untagged and year to date: ' + card);
    await p.click('[data-bzopen]'); await wait(300);
    ok(/October 2026/.test(await txt(p, '#bzMonth')), 'month shown');
    const table = await txt(p, '#bzTable');
    ok(/Clipper \$500 \$120 \$380 \$570/.test(table), 'Clipper row: ' + table);
    ok(/NQ bot \$1,500 \$107 \$1,393 \$1,193/.test(table), 'NQ row: ' + table);
    ok(/Untagged \$80 \$45 \$35 \$15/.test(table), 'Untagged row, separate: ' + table);
    ok(/All \$2,080 \$272 \$1,808 \$1,778/.test(table), 'All row includes untagged: ' + table);
    ok(await p.locator('#bzUntagBox').count() === 1 && /4 untagged entries/.test(await txt(p, '#bzUntagBox')), 'untagged box: ' + await txt(p, '#bzUntagBox'));
    // pick Clipper
    await p.click('[data-bzsel="clipper"]'); await wait(200);
    ok(/Showing: Clipper/.test(await txt(p, '#bzBody')), 'Clipper selected');
    ok(/\$380/.test(await txt(p, '#bzTiles')) && /\$570/.test(await txt(p, '#bzYtd')), 'tiles: ' + await txt(p, '#bzTiles') + ' | ' + await txt(p, '#bzYtd'));
    ok(/Best month: October \$380/.test(await txt(p, '#bzBest')) && /Worst month: August -\$150/.test(await txt(p, '#bzBest')), 'best/worst: ' + await txt(p, '#bzBest'));
    // chart drawn to scale: tallest is Oct income $500
    const bars = await p.evaluate(() => [...document.querySelectorAll('#bzChart [data-bzbar]')].map((r) => ({ g: r.parentNode.dataset.bzm, k: r.dataset.bzbar, v: +r.dataset.v, h: +r.getAttribute('height') })));
    ok(bars.length === 12 && bars[0].g === '2026-05' && bars[11].g === '2026-10', '6 months, 12 bars: ' + bars.length + ' ' + (bars[0] || {}).g);
    const oct = bars.find((x) => x.g === '2026-10' && x.k === 'in'), aug = bars.find((x) => x.g === '2026-08' && x.k === 'out'), sep = bars.find((x) => x.g === '2026-09' && x.k === 'in'), may = bars.find((x) => x.g === '2026-05' && x.k === 'in');
    ok(oct.h > 100 && Math.abs(aug.h / oct.h - 0.5) < 0.02 && Math.abs(sep.h / oct.h - 0.6) < 0.02 && may.h === 0, 'bar heights are to scale: ' + JSON.stringify([oct, aug, sep, may]));
    // miles line: trip 70 + expense 25 = 95; the expense already in the money log is skipped
    const mi = await txt(p, '#bzMiles');
    ok(/\$95 in 2026/.test(mi) && /1 expense you also added to the money log is not counted again/.test(mi), 'miles line: ' + mi);
    ok(/\$475/.test(mi), 'tax-view net after deduction 570-95: ' + mi);
    // untagged selection and all
    await p.click('[data-bzsel="_none"]'); await wait(200);
    ok(/\$35/.test(await txt(p, '#bzTiles')), 'untagged net: ' + await txt(p, '#bzTiles'));
    ok(!(await p.locator('#bzMiles').count()), 'no miles line for untagged (no untagged miles)');
    // previous month
    await p.click('[data-bzmo="-1"]'); await wait(200);
    ok(/September 2026/.test(await txt(p, '#bzMonth')), 'previous month');
    ok(await W(p) <= 390, 'no sideways scroll ' + await W(p));
    await p.screenshot({ path: '/tmp/biz.png' });
    errs.push(...pe);
  }

  // ---- tag untagged helper ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), state: { money, miles }, hash: '#business' });
    await p.click('#bzTagOpen'); await wait(200);
    ok(/Tag untagged entries/.test(await p.textContent('#bzTitle')) && await p.locator('[data-bzpick]').count() === 4, 'four untagged rows: ' + await p.locator('[data-bzpick]').count());
    ok(await p.isDisabled('#bzTagGo'), 'tag button disabled with nothing picked');
    await p.fill('#bzQ', 'clipper'); await wait(200);
    ok(await p.locator('[data-bzpick]').count() === 1, 'search narrows to the clipper fee');
    await p.click('#bzAll'); await wait(200);
    ok(/Tag 1 selected/.test(await p.textContent('#bzTagGo')), 'one selected');
    await p.selectOption('#bzProj', 'clipper'); await p.click('#bzTagGo'); await wait(300);
    let s = await st(p);
    ok(s.money.find((x) => x.note === 'Clipper software fee').proj === 'clipper', 'entry tagged');
    ok(s.money.filter((x) => !x.proj || x.proj === 'gone-project').length === 3, 'others untouched');
    ok(/Tagged 1 entry as Clipper/.test(await p.textContent('#toastMsg')) && await p.isVisible('#toastBtn'), 'toast with undo');
    await p.evaluate(() => document.querySelector('#toastBtn').click()); await wait(300);
    s = await st(p);
    ok(!s.money.find((x) => x.note === 'Clipper software fee').proj, 'undo restores the old tag');
    // bulk: all remaining, money in only
    await p.fill('#bzQ', ''); await p.selectOption('#bzKind', 'out'); await wait(200);
    ok(await p.locator('[data-bzpick]').count() === 3, 'money out only: ' + await p.locator('[data-bzpick]').count());
    await p.click('#bzAll'); await p.selectOption('#bzProj', 'portfolio'); await p.click('#bzTagGo'); await wait(300);
    s = await st(p);
    ok(s.money.filter((x) => x.proj === 'portfolio').length === 3, 'bulk tag of three: ' + s.money.filter((x) => x.proj === 'portfolio').length);
    ok(await W(p) <= 390, 'no sideways scroll in tag view ' + await W(p));
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('BIZ OK');
})();
