// Payday and pay check: node planner/tests/payday.test.js  (serve the site first, PORT env, default 8785; see shifts.test.js)
process.env.PORT = process.env.PORT || '8785';
const { chromium } = require('playwright');
const { wait, open, st } = require('./lib-fin');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime(); // Tuesday 10am in New York
  const ev = (id, cat, date, start, end, repeat = 'weekly') => ({ id, title: 'Shift', cat, date, allDay: false, start, end, endDate: '', repeat, until: '', notes: '', proj: '', ex: [] });
  const state = {
    v: 1, view: 'today', weekStart: 0,
    jobs: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 10, days: [] }, { id: 'job-electric', name: 'Electric', color: '#ca8a04', start: '07:00', end: '15:30', rate: 0, days: [] }],
    categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'personal', name: 'Personal', color: '#64748b' }],
    // every Friday and Saturday 4-10 pm = 6 h each, from Oct 2 / Oct 3
    events: [ev('f', 'job-outback', '2026-10-02', '16:00', '22:00'), ev('s', 'job-outback', '2026-10-03', '16:00', '22:00')],
    money: [{ id: 't1', kind: 'in', amt: 40, date: '2026-10-30', note: 'Outback Steakhouse tips', proj: '', created: 1 }],
  };
  const { ctx, p, errs: pe } = await open(b, { now, state, hash: '#payday' });
  ok(await p.isVisible('#pdDlg'), '#payday opens the sheet');
  ok(/not tax or payroll advice/i.test(await p.textContent('#pdBody')), 'labelled as an estimate, not advice');
  // biweekly, a payday on Fri Nov 6, hours paid 5 days in arrears (Sunday)
  await p.selectOption('#pdFreq', 'biweekly'); await wait(100);
  await p.fill('#pdFirst', '2026-11-06'); await p.dispatchEvent('#pdFirst', 'change'); await wait(200);
  await p.selectOption('#pdLag', '5'); await wait(200);
  const cfg = (await st(p)).paycfg.find((x) => x.id === 'job-outback');
  ok(cfg && cfg.freq === 'biweekly' && cfg.first === '2026-11-06' && cfg.lag === 5, 'schedule saved in the synced collection: ' + JSON.stringify(cfg));
  const body = await p.textContent('#pdBody');
  // payday Nov 6 covers Oct 19 - Nov 1: Fri/Sat Oct 23, 24, 30, 31 = 24 h x $10 = $240 + $40 tips on Oct 30
  ok(/Fri Nov 6/.test(body) && /Oct 19 to Nov 1/.test(body) && /24 h/.test(body) && /\$280/.test(body), 'coming payday shows period and expected pay: ' + body.slice(body.indexOf('Coming'), body.indexOf('Coming') + 220));
  ok(/Fri Nov 20/.test(body), 'second payday two weeks later');
  const s1 = await st(p);
  ok(s1.categories.some((c) => c.id === 'payday'), 'Payday type created');
  ok(!s1.events.some((e) => e.cat === 'payday' || /pay:/.test(e.id)) && s1.events.length === 2, 'paydays are not stored as calendar events');
  // check my paycheck: Oct 23 payday covers Oct 5 - Oct 18 = Oct 9, 10, 16, 17 = 24 h = $240 (no tips)
  ok(/Fri Oct 23/.test(await p.textContent('#pdChkSel')), 'last payday is in the picker');
  await p.selectOption('#pdChkSel', '2026-10-23');
  await p.fill('#pdGot', '202'); await wait(150);
  const out = await p.textContent('#pdChkOut');
  ok(/You were paid \$38 less than your scheduled hours suggest: check your stub/.test(out), 'flags a $38 shortfall: ' + out);
  ok(/3\.8 h/.test(out), 'says about how many hours are missing: ' + out);
  await p.fill('#pdGot', '237'); await wait(100);
  ok(/That matches/.test(await p.textContent('#pdChkOut')), 'within $5 matches');
  await p.fill('#pdGot', '260'); await wait(100);
  ok(/\$20 more/.test(await p.textContent('#pdChkOut')), 'more than expected is mentioned');
  await p.fill('#pdGot', '202'); await p.click('#pdChkSave'); await wait(300);
  const chk = (await st(p)).paychk;
  ok(chk.length === 1 && chk[0].diff === -38 && chk[0].expected === 240 && chk[0].got === 202 && chk[0].pay === '2026-10-23' && chk[0].hours === 24, 'check saved in history: ' + JSON.stringify(chk));
  ok(/\$38 short/.test(await p.textContent('#pdBody')), 'history lists the shortfall');
  // twice a month on the 15th and the last day; a weekend payday moves to the Friday before
  await p.selectOption('#pdFreq', 'twice'); await wait(200);
  await p.selectOption('#pdD1', '15'); await wait(150); await p.selectOption('#pdD2', '31'); await wait(250);
  const t2 = await p.textContent('#pdBody');
  ok(/Fri Nov 13/.test(t2) && /Mon Nov 30/.test(t2), 'twice a month: Nov 15 is a Sunday so Friday the 13th, then the last day: ' + t2.slice(t2.indexOf('Coming'), t2.indexOf('Coming') + 200));
  await p.selectOption('#pdFreq', 'monthly'); await wait(200); await p.selectOption('#pdD1', '1'); await wait(250);
  ok(/Tue Dec 1/.test(await p.textContent('#pdBody')), 'monthly on the 1st');
  await p.selectOption('#pdFreq', 'weekly'); await wait(200); await p.fill('#pdFirst', '2026-11-06'); await p.dispatchEvent('#pdFirst', 'change'); await wait(250);
  ok(/Fri Nov 13/.test(await p.textContent('#pdBody')), 'weekly adds the next Friday');
  await p.selectOption('#pdFreq', 'biweekly'); await wait(250);
  // overlay on the calendar
  await p.click('#pdDlg [data-close]'); ok(!(await p.isVisible('#pdDlg')), 'closes');
  const card = await p.textContent('#pdCard');
  ok(/Fri Nov 6/.test(card) && /\$280/.test(card) && /In 3 days/.test(card), 'Today card shows the next payday: ' + card);
  await p.evaluate(() => { location.hash = '#agenda'; }); await wait(500);
  const ag = await p.textContent('#main');
  ok(/Payday: Outback Steakhouse, about \$280/.test(ag), 'agenda shows the Payday item with the expected pay: ' + ag.slice(0, 200));
  await p.click('[data-ev^="pay:"]'); await wait(300);
  ok(await p.isVisible('#pdDlg'), 'tapping a payday on the calendar opens Payday');
  // hide it
  await p.uncheck('#pdOn'); await wait(300); await p.click('#pdDlg [data-close]'); await wait(300);
  ok(!/Payday: Outback/.test(await p.textContent('#main')), 'unticking removes the paydays from the calendar');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await p.evaluate(() => { location.hash = '#payday'; }); await wait(400);
  const w2 = await p.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('#pdDlg .dlg').scrollWidth, document.querySelector('#pdDlg .dlg').clientWidth]); ok(w2[0] <= 390 && w2[1] <= w2[2], 'sheet fits the phone ' + w2);
  await p.screenshot({ path: '/tmp/payday.png' });
  await ctx.close(); await b.close();
  const all = [...errs, ...pe];
  if (all.length) { console.log('FAIL', all); process.exit(1); } console.log('PAYDAY OK');
})();
