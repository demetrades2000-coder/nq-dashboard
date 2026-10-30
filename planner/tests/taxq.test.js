// Quarterly tax planner: node planner/tests/taxq.test.js  (serve the site first, PORT env, default 8786; see shifts.test.js)
process.env.PORT = process.env.PORT || '8786';
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, etTrade, open, st } = require('./lib-fin');
const at = (iso) => Date.parse(iso + 'T15:10:00Z');
let n = 0;
const m = (kind, amt, date, proj, extra) => ({ id: 'm' + ++n, created: n, kind, amt, date, proj, note: '', ...(extra || {}) });
const money = [
  m('in', 3000, '2026-07-10', 'clipper'), m('out', 500, '2026-07-12', 'clipper'), m('in', 1000, '2026-05-05', 'nq'), m('out', 200, '2026-05-20', 'nq'), m('in', 400, '2026-09-01', 'nq'),
  m('in', 999, '2026-07-01', ''), // untagged: not business income
];
const miles = [{ id: 't1', kind: 'trip', date: '2026-08-03', from: 'Home', to: 'Site', job: 'Clipper', miles: 50, rate: 0.7 }]; // $35 deduction
(async () => {
  const errs = [], ok = (c, msg) => { if (!c) errs.push(msg); };
  const b = await chromium.launch();
  const txt = async (p, sel) => (await expand.within(p, sel), await p.innerText(sel)).replace(/\s+/g, ' ');
  const W = (p) => p.evaluate(() => document.documentElement.scrollWidth);
  const seed = (now, o) => nqCache(now, o || {});

  // ---- empty, #taxes ----
  {
    const { p, errs: pe } = await open(b, { now: at('2026-07-01'), seed: seed(at('2026-07-01')), hash: '#taxes' });
    ok(await p.isVisible('#tqDlg'), '#taxes opens the planner');
    ok(/not tax advice/i.test(await txt(p, '#tqNote')) && /tax professional/.test(await txt(p, '#tqNote')) && /Section 1256/.test(await txt(p, '#tqNote')) && /60%/.test(await txt(p, '#tqNote')), 'disclaimer and 1256 note: ' + await txt(p, '#tqNote'));
    ok(await p.inputValue('#tqRate') === '25', 'default rate 25');
    ok(/Estimate/.test(await p.textContent('#tqTitle')), 'labelled as an estimate');
    await p.keyboard.press('Escape'); await wait(200);
    ok(!(await p.locator('#tqCard').count()), 'no card 76 days before the next due date');
    errs.push(...pe);
  }

  // ---- numbers, card, payments, calendar ----
  {
    const now = at('2026-09-01'); // 14 days before Sep 15
    const { p, errs: pe } = await open(b, { now, seed: seed(now), state: { money, miles } });
    const card = await txt(p, '#tqCard');
    ok(/Tax due/.test(card) && /Q3 2026/.test(card) && /Sep 15 \(in 14 days\)/.test(card), 'card in the window: ' + card);
    ok(/\$616\.25 suggested/.test(card) && /\$0 paid/.test(card) && /\$616\.25 still to pay/.test(card), 'card numbers: ' + card);
    ok(/Set aside this quarter \(Q4 \(Sep-Dec\)\): \$100/.test(card), 'card set aside line: ' + card);
    await expand(p, 'tax'); await p.click('[data-tqopen]'); await wait(300);
    const t = await txt(p, '#tqTable');
    ok(/Q1 \(Jan-Mar\).*Apr 15 \$0 \$0/.test(t), 'Q1 zero: ' + t);
    ok(/Q2 \(Apr-May\).*Jun 15 \$200 \$0/.test(t), 'Q2 200: ' + t);
    ok(/Q3 \(Jun-Aug\).*Due in 14 days Sep 15 \$616\.25 \$0/.test(t), 'Q3 616.25 (3000 - 500 - 35 mileage = 2465 at 25%): ' + t);
    ok(/Q4 \(Sep-Dec\).*Jan 15 \$100 \$0/.test(t), 'Q4 100: ' + t);
    const lines = await txt(p, '#tqLines'), tiles = await txt(p, '#tqTiles');
    ok(/Business income \(money in, tagged\) \$4,400/.test(lines) && /Business expenses \(money out\) -\$700/.test(lines) && /Mileage and tools deduction -\$35/.test(lines) && /Net business result \$3,665/.test(lines), 'breakdown, untagged left out: ' + lines);
    ok(/\$916\.25/.test(tiles) && /est\. tax at 25%/.test(tiles), 'year tax: ' + tiles);
    ok(/Set aside this quarter \(Q4 \(Sep-Dec\)\)\s*\$100/.test(await txt(p, '#tqSet')), 'set aside box: ' + await txt(p, '#tqSet'));
    // editable rate
    await p.fill('#tqRate', '30'); await p.press('#tqRate', 'Tab'); await wait(300);
    ok((await st(p)).taxcfg.find((x) => x.id === 'cfg').rate === 30, 'rate saved');
    ok(/Q3 \(Jun-Aug\).*\$739\.50/.test(await txt(p, '#tqTable')), 'rate changes the suggestion: ' + await txt(p, '#tqTable'));
    await p.fill('#tqRate', '25'); await p.press('#tqRate', 'Tab'); await wait(300);
    // log payments: the quarter defaults to the next due date
    ok(await p.inputValue('#tqPq') === '2026-Q3', 'default quarter for today is Q3: ' + await p.inputValue('#tqPq'));
    await p.fill('#tqPa', '300'); await p.fill('#tqPn', 'IRS Direct Pay'); await p.click('#tqPaySave'); await wait(300);
    await p.fill('#tqPa', '200'); await p.fill('#tqPd', '2026-05-30'); await wait(100);
    ok(await p.inputValue('#tqPq') === '2026-Q2', 'quarter follows the date: ' + await p.inputValue('#tqPq'));
    await p.click('#tqPaySave'); await wait(300);
    let s = await st(p);
    ok(s.taxpay.length === 2 && s.taxpay.some((x) => x.amt === 300 && x.q === '2026-Q3' && x.note === 'IRS Direct Pay') && s.taxpay.some((x) => x.amt === 200 && x.q === '2026-Q2'), 'payments saved: ' + JSON.stringify(s.taxpay));
    const t2 = await txt(p, '#tqTable');
    ok(/Q2 \(Apr-May\)Paid.*\$200 \$200/.test(t2.replace('Paid', 'Paid')) || /Paid Jun 15 \$200 \$200/.test(t2), 'Q2 paid in full: ' + t2);
    ok(/Q3 \(Jun-Aug\).*Sep 15 \$616\.25 \$300/.test(t2), 'Q3 paid vs suggested: ' + t2);
    ok(/\$500/.test(await txt(p, '#tqTiles')), 'paid for the year: ' + await txt(p, '#tqTiles'));
    // weekend due dates move to Monday: Apr 15 2028 is a Saturday
    await p.click('[data-tqyr="1"]'); await p.click('[data-tqyr="1"]'); await wait(200);
    ok(/Q1 \(Jan-Mar\).*Apr 17 /.test(await txt(p, '#tqTable')), '2028 Q1 due moves to Monday Apr 17: ' + await txt(p, '#tqTable'));
    await p.click('[data-tqyr="-1"]'); await p.click('[data-tqyr="-1"]'); await wait(200);
    ok(await W(p) <= 390, 'no sideways scroll ' + await W(p));
    await p.screenshot({ path: '/tmp/taxq.png', fullPage: false });
    // remove a payment (undo available)
    await p.evaluate(() => document.querySelector('[data-tqdel]').click()); await wait(300);
    ok((await st(p)).taxpay.length === 1, 'payment removed');
    await p.keyboard.press('Escape'); await wait(300);
    // calendar overlay: not stored, red, all day, on Sep 15
    ok(!(((await st(p)).events || []).some((e) => /Tax due/.test(e.title || ''))), 'due dates are not stored as events');
    await p.goto(p.url().split('#')[0] + '#agenda'); await wait(800);
    const ag = await txt(p, '#main');
    ok(/Tax due: Q3 2026 estimated payment \(about \$616\.25\)/.test(ag), 'Tax due on the agenda: ' + ag.slice(0, 300));
    errs.push(...pe);
  }

  // ---- window edges and late ----
  for (const [day, want, label] of [['2026-08-25', true, '21 days before'], ['2026-08-24', false, '22 days before'], ['2026-09-15', true, 'due day'], ['2026-09-16', true, 'one day late, unpaid'], ['2026-09-30', false, 'over 14 days late']]) {
    const now = at(day);
    const { p, errs: pe } = await open(b, { now, seed: seed(now), state: { money, miles } });
    ok(!!(await p.locator('#tqCard').count()) === want, `card ${label} (${day}) should be ${want}`);
    if (day === '2026-09-16') {
      const c = await txt(p, '#tqCard');
      ok(/was due Sep 15, 1 day ago/.test(c) && /\$616\.25 still to pay/.test(c), 'late card: ' + c);
      await expand(p, 'tax'); await p.click('[data-tqlog]'); await wait(300);
      ok(await p.isVisible('#tqDlg') && await p.isVisible('#tqLate'), 'late banner in the planner: ' + (await p.locator('#tqLate').count()));
    }
    errs.push(...pe);
  }
  { // paid in full: a late day shows no card
    const now = at('2026-09-16'), pay = [{ id: 'x1', amt: 616.25, date: '2026-09-10', q: '2026-Q3', note: '' }, { id: 'x2', amt: 200, date: '2026-05-30', q: '2026-Q2', note: '' }];
    const { p, errs: pe } = await open(b, { now, seed: seed(now), state: { money, miles, taxpay: pay } });
    ok(!(await p.locator('#tqCard').count()), 'no late card once the quarter is paid');
    errs.push(...pe);
  }

  // ---- calendar item opens the planner; trading P&L toggle without double counting ----
  {
    const now = at('2026-09-01');
    const trades = [etTrade('2026-07-14', '09:45', 800), etTrade('2026-07-15', '10:00', -200), etTrade('2026-09-01', '09:45', 500)];
    const mon = [...money, m('in', 1000, '2026-07-20', 'nq', { src: 'prop', note: 'Prop payout' })];
    const { p, errs: pe } = await open(b, { now, seed: seed(now, { trades }), state: { money: mon, miles }, hash: '#taxes' });
    ok(/Q3 \(Jun-Aug\).*\$866\.25/.test(await txt(p, '#tqTable')), 'without trading: payout counts as income (3465 at 25%): ' + await txt(p, '#tqTable'));
    await p.check('#tqTrade'); await wait(300);
    const t = await txt(p, '#tqTable'), lines = await txt(p, '#tqLines');
    ok(/Q3 \(Jun-Aug\).*\$766\.25/.test(t), 'trading on: 3000 + 600 trading - 500 - 35 = 3065 at 25% (payout left out): ' + t);
    ok(/Live and paper trading P&L \$1,100/.test(lines), 'trading line (Q3 and Q4 trades): ' + lines);
    ok(/\$1,000 of prop payouts.*left out/.test(await txt(p, '#tqSkip')), 'explains the skipped payout: ' + await p.locator('#tqSkip').count());
    await p.uncheck('#tqCal'); await wait(200);
    ok((await st(p)).taxcfg.find((x) => x.id === 'cfg').cal === false, 'calendar toggle saved');
    await p.keyboard.press('Escape'); await wait(300);
    await p.goto(p.url().split('#')[0] + '#agenda'); await wait(800);
    ok(!/Tax due:/.test(await txt(p, '#main')), 'overlay off hides the items');
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('TAXQ OK');
})();
