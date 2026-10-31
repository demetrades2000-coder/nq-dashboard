// Bills and cash flow: node planner/tests/bills.test.js  (serve the site first, PORT env, default 8781; see shifts.test.js)
const { chromium } = require('playwright');
const { wait, nqCache, open, st } = require('./lib-money');
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const add = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime(); // a Tuesday, 10am New York
  const today = new Date(2026, 10, 3);
  // last four weeks of trading: $250 a weekday => $250 a week
  const pnl = {}; for (let i = 1; i <= 28; i++) { const d = add(today, -i); if (d.getDay() > 0 && d.getDay() < 6) pnl[key(d)] = 50; }
  const jobs = [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 10, days: [] }];
  const shiftDay = key(add(today, 2));
  const state = { v: 1, view: 'today', jobs, categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'personal', name: 'Personal', color: '#64748b' }],
    events: [{ id: 'sh1', title: 'Outback Steakhouse', cat: 'job-outback', date: shiftDay, allDay: false, start: '16:00', end: '22:00', endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] }],
    money: [{ id: 'm1', kind: 'in', amt: 1000, date: key(add(today, 9)), note: 'Payout', proj: '' }, { id: 'm2', kind: 'out', amt: 60, date: key(add(today, 4)), note: 'Gym', proj: '' }, { id: 'm3', kind: 'out', amt: 999, date: key(add(today, -3)), note: 'Past out', proj: '' }] };
  const { p, errs: pe } = await open(b, { now, seed: nqCache(now, { pnl }), state, hash: '#bills' });
  ok(await p.isVisible('#bnDlg'), '#bills opens the sheet');
  ok(/Estimate/.test(await p.textContent('#bnTitle')), 'labelled as an estimate');
  ok(/Type your balance/.test(await p.textContent('#bnWarn')), 'asks for a balance first: ' + await p.textContent('#bnWarn'));
  // balance and tax
  await p.fill('#bnBal', '300'); await p.press('#bnBal', 'Tab'); await wait(200);
  ok((await st(p)).cashcfg.find((x) => x.id === 'cfg').bal === 300, 'balance saved in the synced collection');
  ok((await p.inputValue('#bnTax')) === '20', 'tax default 20%');
  // rent, monthly, due 6 days from now
  const rentDay = add(today, 6);
  await p.click('#bnAdd'); await p.click('[data-bnpre="Rent"]'); await p.fill('#bnAmt', '1200'); await p.fill('#bnDay', String(rentDay.getDate()));
  await p.click('#bnSave'); await wait(300);
  const s1 = await st(p);
  ok(s1.bills.length === 1 && s1.bills[0].name === 'Rent' && s1.bills[0].amt === 1200 && s1.bills[0].freq === 'monthly' && s1.bills[0].day === rentDay.getDate(), 'rent saved: ' + JSON.stringify(s1.bills));
  ok(s1.categories.some((c) => c.id === 'bills' && c.name === 'Bills'), 'Bills type created on first use');
  ok(!s1.events.some((e) => e.cat === 'bills' || /bill/i.test(e.id)), 'no bill events stored in S.events');
  const w = await p.textContent('#bnWarn');
  ok(/short \$\d/.test(w) && /rent/.test(w) && new RegExp('Nov ' + rentDay.getDate()).test(w), 'warns about rent: ' + w);
  ok(await p.isVisible('#bnChart') && await p.isVisible('#bnLow'), 'chart with lowest-day marker');
  // income = pay 6h x $10 + $250 on each weekday after today + $1000 payout; tax = 20%
  const tiles = await p.textContent('#bnTiles');
  const weekdays = [...Array(29)].map((_, i) => add(today, i + 1)).filter((d) => d.getDay() > 0 && d.getDay() < 6).length;
  const income = 60 + weekdays * 50 + 1000, tax = Math.round(income * 0.2).toLocaleString('en-US');
  ok(tiles.includes('$' + tax), 'tax set-aside is 20% of ' + income + ' => $' + tax + ' in ' + tiles);
  const src = await p.textContent('#bnSrc');
  ok(/-\$60/.test(src) && !/999/.test(src), 'future out counted, past out not: ' + src);
  await p.fill('#bnTax', '30'); await p.press('#bnTax', 'Tab'); await wait(200);
  ok((await st(p)).cashcfg[0].tax === 30, 'tax % editable');
  // weekly phone bill and a bill that already ended
  await p.click('#bnAdd'); await p.fill('#bnName', 'Phone'); await p.fill('#bnAmt', '25'); await p.selectOption('#bnFreq', 'weekly'); await p.selectOption('#bnDow', '1'); await p.click('#bnSave'); await wait(300);
  await p.click('#bnAdd'); await p.fill('#bnName', 'Old gym'); await p.fill('#bnAmt', '40'); await p.fill('#bnDay', '1'); await p.fill('#bnEnd', key(add(today, -40))); await p.click('#bnSave'); await wait(300);
  ok(/finished/.test(await p.textContent('#bnList')), 'ended bill shows as finished');
  const n0 = await p.evaluate(() => document.querySelectorAll('#bnList .bn-row').length); ok(n0 === 3, '3 rows ' + n0);
  await p.click('#bnAdd'); await p.fill('#bnName', 'Insurance'); await p.fill('#bnAmt', '90'); await p.fill('#bnDay', '31'); await p.click('#bnSave'); await wait(300);
  await p.click('#bnAdd'); await p.fill('#bnName', 'Trash'); await p.fill('#bnAmt', '15'); await p.selectOption('#bnFreq', 'biweekly'); await p.fill('#bnYmd', key(add(today, 14))); await p.click('#bnSave'); await wait(300);
  await p.click('#bnAdd'); await p.click('#bnSave'); ok(await p.isVisible('#bnErr'), 'empty form is refused'); await p.click('#bnCancel');
  // calendar overlay
  await p.click('#bnDlg [data-close]'); await wait(200);
  await p.evaluate(() => document.querySelector('#views [data-v=agenda]').click()); await wait(300);
  const ag = await p.textContent('#main');
  ok(/Rent \$1,200/.test(ag) && /Phone \$25/.test(ag), 'bills show on the calendar (agenda)');
  ok(!/Old gym/.test(ag), 'ended bill not shown');
  const cnt = (name) => p.evaluate((n) => [...document.querySelectorAll('[data-ev^="bill:"]')].filter((x) => x.textContent.includes(n)).length, name);
  ok((await cnt('Insurance')) === 1, 'day 31 bill falls on Nov 30 only: ' + await cnt('Insurance'));
  ok((await cnt('Trash')) >= 3, 'every-2-weeks bill: ' + await cnt('Trash'));
  await p.evaluate(() => document.querySelector('#views [data-v=month]').click()); await wait(300);
  const chip = p.locator('[data-ev^="bill:"]').first(); ok(await chip.count() > 0, 'bill chip in month view');
  await chip.click({ force: true }); await wait(300);
  ok(await p.isVisible('#bnDlg'), 'tapping a bill opens Bills');
  // delete with confirm, then undo
  await p.click('[data-bnedit]:has-text("Old gym")'); await p.click('#bnDel'); await wait(200);
  await p.click('#askYes'); await wait(300);
  ok((await st(p)).bills.length === 4, 'deleted after confirming');
  await p.evaluate(() => document.querySelector('#toastBtn').click()); await wait(200);
  ok((await st(p)).bills.length === 5, 'undo brings it back');
  await p.click('#bnDlg [data-close]'); await wait(200);
  // Today card
  await p.evaluate(() => document.querySelector('#views [data-v=today]').click()); await wait(300);
  const card = await p.textContent('#bnCard'); ok(/Bills and cash flow/.test(card) && /Estimate/.test(card) && /lowest in 30 days/.test(card), 'Today card: ' + card.replace(/\s+/g, ' ').slice(0, 160));
  ok(/short \$/.test(card), 'Today card carries the warning');
  const wd = await p.evaluate(() => document.documentElement.scrollWidth); ok(wd <= 390, 'no sideways scroll ' + wd);
  await p.click('[data-bnopen]'); await wait(200);
  const wd2 = await p.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('#bnDlg .dlg').scrollWidth, document.querySelector('#bnDlg .dlg').clientWidth]); ok(wd2[0] <= 390 && wd2[1] <= wd2[2] + 1, 'dialog fits 390px ' + wd2);
  await p.screenshot({ path: '/tmp/bills.png' });
  await p.reload(); await wait(800);
  const again = await st(p); ok(again.bills.length === 5 && again.cashcfg.length === 1, 'persists after reload');
  errs.push(...pe);
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('BILLS OK');
})();
