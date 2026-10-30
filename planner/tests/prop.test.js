// Prop firm ledger and ROI: node planner/tests/prop.test.js  (serve the site first, PORT env, default 8786; see shifts.test.js)
process.env.PORT = process.env.PORT || '8786';
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, open, st } = require('./lib-fin');
const NOW = Date.parse('2026-10-30T15:10:00Z'); // Friday 11:10 ET
const fee = (id, kind, amt, date, mid) => ({ id, kind, amt, date, mid: mid || '' });
const ledger = [
  { id: 'pa1', firm: 'MFFU', name: '50K Builder', size: 50000, start: '2026-09-01', end: '2026-09-15', status: 'paid', split: 90, acct: '', proj: 'nq', fees: [fee('f1', 'eval', 107, '2026-09-01'), fee('f2', 'reset', 80, '2026-09-05'), fee('f3', 'data', 30, '2026-10-01')], pays: [{ id: 'p1', amt: 1500, date: '2026-10-20', mid: '' }] },
  { id: 'pa2', firm: 'Topstep', name: '25K Combine', size: 25000, start: '2026-08-01', end: '2026-08-12', status: 'failed', split: 90, acct: '', proj: 'nq', fees: [fee('f4', 'eval', 150, '2026-08-01')], pays: [] },
  { id: 'pa3', firm: 'MFFU', name: '25K Eval', size: 25000, start: '2026-10-20', end: '', status: 'active', split: 90, acct: '', proj: 'nq', fees: [fee('f5', 'eval', 60, '2026-10-20')], pays: [] },
];
const live = [{ name: 'MFFU 25K Eval', strategy: 'LIT', stage: 'eval', status: 'open', profit: 800, target: 1500, sessions_left: 6 }, { name: 'Topstep 50K Combine', strategy: 'X', stage: 'eval', status: 'open', profit: 0, target: 3000, sessions_left: 10 }];
const withLive = () => { const c = nqCache(NOW, {}); c.doc.trade.accounts = live; return c; };
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const txt = async (p, sel) => (await p.innerText(sel)).replace(/\s+/g, ' ');
  const W = (p) => p.evaluate(() => document.documentElement.scrollWidth);

  // ---- empty: add an account, fees and a payout by hand ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), hash: '#prop' });
    ok(await p.isVisible('#ppDlg'), '#prop opens the ledger');
    ok(/Nothing logged yet/.test(await txt(p, '#ppBody')), 'empty text');
    await p.click('#ppAdd');
    await p.click('#ppSave'); ok(!(((await st(p)) || {}).propacct || []).length, 'needs a name');
    await p.fill('#ppf-firm', 'MFFU'); await p.fill('#ppf-name', '50K Builder'); await p.fill('#ppf-size', '50000'); await p.fill('#ppf-start', '2026-10-01');
    ok(!(await p.isChecked('#ppf-fee0m')), 'money checkbox is off by default');
    await p.fill('#ppf-fee0', '107');
    await p.click('#ppSave'); await wait(300);
    let s = await st(p), a = s.propacct[0];
    ok(a && a.firm === 'MFFU' && a.size === 50000 && a.fees.length === 1 && a.fees[0].amt === 107 && a.fees[0].mid === '' && a.split === 90, 'account saved: ' + JSON.stringify(a));
    ok(!(s.money || []).length, 'no money entry unless ticked');
    // now in the edit view: add a reset fee with the money checkbox, a data fee without it
    ok(!(await p.isChecked('#ppf-fm')) && !(await p.isChecked('#ppf-pm')), 'fee and payout checkboxes default off');
    await p.selectOption('#ppf-fk', 'reset'); await p.fill('#ppf-fa', '80'); await p.check('#ppf-fm'); await p.click('#ppAddFee'); await wait(300);
    await p.selectOption('#ppf-fk', 'data'); await p.fill('#ppf-fa', '30'); await p.click('#ppAddFee'); await wait(300);
    s = await st(p); a = s.propacct[0];
    ok(a.fees.length === 3 && a.fees.some((f) => f.kind === 'reset' && f.mid) && a.fees.some((f) => f.kind === 'data' && !f.mid), 'three fee lines, only the reset in the money log: ' + JSON.stringify(a.fees));
    const mo = s.money.filter((m) => m.src === 'prop');
    ok(mo.length === 1 && mo[0].kind === 'out' && mo[0].amt === 80 && mo[0].proj === 'nq' && /reset fee/i.test(mo[0].note), 'money out entry: ' + JSON.stringify(mo));
    // payout with the checkbox
    await p.fill('#ppf-pa', '1500'); await p.fill('#ppf-pd', '2026-10-25'); await p.check('#ppf-pm'); await p.click('#ppAddPay'); await wait(300);
    s = await st(p); a = s.propacct[0];
    ok(a.pays.length === 1 && a.pays[0].amt === 1500 && a.pays[0].mid, 'payout saved');
    ok(s.money.some((m) => m.kind === 'in' && m.amt === 1500 && m.date === '2026-10-25' && m.src === 'prop'), 'payout money in entry');
    // status change defaults the pass date
    await p.selectOption('#ppf-status', 'passed'); await wait(200);
    ok((await st(p)).propacct[0].end === '2026-10-30', 'passing sets today as the pass date');
    // removing a fee removes its money entry too
    const resetId = (await st(p)).propacct[0].fees.find((f) => f.kind === 'reset');
    if (resetId) { await p.evaluate((id) => document.querySelector(`[data-ppfeedel="${id}"]`).click(), resetId.id); await wait(300); }
    s = await st(p);
    ok(!s.propacct[0].fees.some((f) => f.kind === 'reset') && !s.money.some((m) => m.amt === 80), 'removing the fee removes its money entry');
    await p.click('#ppBack'); await wait(200);
    ok(/Evals have cost you \$137 and paid \$1,500: net \$1,363/.test(await txt(p, '#ppPlain')), 'plain line: ' + await txt(p, '#ppPlain'));
    ok(await W(p) <= 390, 'no sideways scroll ' + await W(p));
    errs.push(...pe);
  }

  // ---- seeded ledger: numbers ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: withLive(), state: { propacct: ledger } });
    const card = await txt(p, '#ppCard');
    ok(/\$427/.test(card) && /\$1,500/.test(card) && /\$1,073/.test(card), 'card tiles: ' + card);
    ok(/Evals have cost you \$427 and paid \$1,500: net \$1,073/.test(card), 'card plain line: ' + card);
    await expand(p, 'prop'); await p.click('[data-ppopen]'); await wait(300);
    const stats = await txt(p, '#ppStats');
    ok(/ROI 251%/.test(stats), 'roi: ' + stats);
    ok(/Pass rate 50% \(1 of 2\)/.test(stats), 'pass rate: ' + stats);
    ok(/Cost per pass \$427/.test(stats), 'cost per pass: ' + stats);
    ok(/Average days to pass 14 days/.test(stats), 'avg days: ' + stats);
    ok(/past break-even by \$1,073/.test(await txt(p, '#ppPlain')), 'past break-even: ' + await txt(p, '#ppPlain'));
    const list = await txt(p, '#ppList');
    ok(/Live: MFFU 25K Eval/.test(list) && /\$800 of \$1,500 profit/.test(list) && /6 sessions left/.test(list), 'live account linked by name: ' + list);
    ok(!/Live: Topstep 50K/.test(list), 'a different live account is not linked to the wrong entry');
    ok(/Add Topstep 50K Combine/.test(await txt(p, '#ppMissing')) && !/Add MFFU 25K Eval/.test(await txt(p, '#ppMissing')), 'unlinked live account offered: ' + await txt(p, '#ppMissing'));
    await p.click('[data-ppnew]'); await wait(200);
    ok(await p.inputValue('#ppf-size') === '50000' && (await p.inputValue('#ppf-firm')) === 'Topstep', 'prefill from the dashboard name: ' + await p.inputValue('#ppf-size'));
    await p.click('#ppCancel'); await wait(200);
    // open an account: live line and fees
    await p.click('[data-ppedit="pa3"]'); await wait(200);
    ok(/Live: MFFU 25K Eval/.test(await txt(p, '#ppLiveLine')), 'live line in the edit view');
    // change the split: autosaves
    await p.fill('#ppf-split', '80'); await p.press('#ppf-split', 'Tab'); await wait(300);
    ok((await st(p)).propacct.find((x) => x.id === 'pa3').split === 80, 'edit autosaves');
    ok(await W(p) <= 390, 'no sideways scroll in edit ' + await W(p));
    // delete with confirmation
    await p.click('#ppDel'); await wait(200);
    ok(await p.isVisible('#askDlg'), 'delete asks first');
    await p.click('#askYes'); await wait(300);
    ok((await st(p)).propacct.length === 2, 'account deleted');
    errs.push(...pe);
  }

  // ---- losing: break-even still needed, no live data at all ----
  {
    const lost = [{ id: 'x1', firm: 'A', name: 'one', size: 50000, start: '2026-09-01', end: '', status: 'failed', split: 90, fees: [fee('g1', 'eval', 200, '2026-09-01'), fee('g2', 'reset', 100, '2026-09-10')], pays: [] },
      { id: 'x2', firm: 'B', name: 'two', size: 25000, start: '2026-10-01', end: '', status: 'active', split: 90, fees: [fee('g3', 'eval', 127, '2026-10-01')], pays: [] }];
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), state: { propacct: lost }, hash: '#prop' });
    const plain = await txt(p, '#ppPlain'), stats = await txt(p, '#ppStats');
    ok(/Evals have cost you \$427 and paid \$0: net -\$427/.test(plain), 'loss line: ' + plain);
    ok(/Break-even: \$427 more in payouts \(about \$474\.44 of profit at a 90% split\)/.test(plain), 'break-even needed: ' + plain);
    ok(/Cost per pass no pass yet/.test(stats) && /ROI -100%/.test(stats) && /Pass rate 0% \(0 of 1\)/.test(stats) && /Average days to pass n\/a/.test(stats), 'stats with no pass: ' + stats);
    ok(!(await p.locator('#ppList').innerText()).includes('Live:'), 'no live line without dashboard data');
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('PROP OK');
})();
