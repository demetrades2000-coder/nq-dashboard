// Hours cap and overtime: node planner/tests/hours.test.js  (serve the site first, PORT env, default 8785; see shifts.test.js)
process.env.PORT = process.env.PORT || '8785';
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, open, st } = require('./lib-fin');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime(); // Tuesday 10am in New York; the week is Sun Nov 1 - Sat Nov 7
  const ev = (id, cat, date, start, end) => ({ id, title: 'Shift', cat, date, allDay: false, start, end, endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] });
  const state = {
    v: 1, view: 'today', weekStart: 0,
    jobs: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 10, days: [] }, { id: 'job-electric', name: 'Electric', color: '#ca8a04', start: '07:00', end: '15:30', rate: 30, days: [] }],
    categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'job-electric', name: 'Electric', color: '#ca8a04' }],
    events: [
      ev('o1', 'job-outback', '2026-11-01', '16:00', '22:00'), // Sun 6
      ev('e1', 'job-electric', '2026-11-02', '07:00', '15:00'), // Mon 8
      ev('e2', 'job-electric', '2026-11-03', '07:00', '15:00'), // Tue 8 (3 h done at 10 am)
      ev('e3', 'job-electric', '2026-11-04', '07:00', '15:00'), // Wed 8
      ev('o2', 'job-outback', '2026-11-04', '17:00', '23:30'), // Wed 6.5, closes at 11:30 pm
      ev('e4', 'job-electric', '2026-11-05', '07:00', '15:00'), // Thu 8: 7.5 h after the Wed close, 1 h before Outback
      ev('o3', 'job-outback', '2026-11-05', '16:00', '22:00'), // Thu 6
      ev('o4', 'job-outback', '2026-11-06', '16:00', '22:00'), // Fri 6
      ev('o5', 'job-outback', '2026-11-07', '16:00', '22:00'), // Sat 6
    ],
  };
  // Electric 32 h, Outback 30.5 h, 62.5 h in all; 17 h worked by Tuesday 10 am (6 + 8 + 3)
  const { ctx, p, errs: pe } = await open(b, { now, state });
  await expand(p, 'hr'); ok(await p.isVisible('#hrCard'), 'hours card is on Today');
  let card = await p.textContent('#hrCard');
  ok(/17 h worked so far, 62\.5 h with the shifts still to come\. Limit 40 h\./.test(card), 'bar text: ' + card);
  ok(await p.isVisible('#hrCard .hr-bar.over'), 'bar is red when the projection is over the limit');
  ok(/All your jobs together come to 62\.5 h, 22\.5 h over your 40 h limit/.test(card), 'combined warning: ' + card);
  ok(/Only 7\.5 h of rest between Wednesday's Outback Steakhouse shift ending 11:30pm and Thursday's Electric shift starting 7am/.test(card), 'closing-to-opening warning: ' + card);
  ok(/7 days in a row with a shift \(Sunday Nov 1 to Saturday Nov 7\)/.test(card), 'seven days in a row: ' + card);
  // per-job overtime: Outback over 25 h
  await p.evaluate(() => { location.hash = '#hours'; }); await wait(400);
  ok(await p.isVisible('#hrDlg'), '#hours opens the sheet');
  let body = await p.textContent('#hrBody');
  ok(/Outback Steakhouse30\.5 h of 40/.test(body.replace(/\s+/g, '')) || /30\.5 h of 40/.test(body), 'per-job rows: ' + body.slice(0, 400));
  ok(!/overtime at 1\.5x/.test(body), 'no per-job overtime at the default 40 h');
  await p.fill('[data-hrj="job-outback"]', '25'); await p.press('[data-hrj="job-outback"]', 'Tab'); await wait(300);
  body = await p.textContent('#hrBody');
  ok(/Saturday's Outback Steakhouse shift puts you over 25 h\. The week adds up to 30\.5 h, 5\.5 h overtime at 1\.5x = about \$27\.50 extra/.test(body), 'overtime warning with the extra pay: ' + body);
  ok(/Only 1 h of rest between Thursday's Electric shift ending 3pm and Thursday's Outback/.test(body) || /Only 1 h of rest between Thursday's Electric shift ending 3pm and the Outback/.test(body), 'same-day gap: ' + body);
  const s1 = await st(p);
  ok(s1.hrcfg.find((x) => x.id === 'j:job-outback').ot === 25, 'per-job threshold saved in the synced collection');
  // the overtime multiplier and combined limit change the numbers
  await p.fill('#hrMult', '2'); await p.press('#hrMult', 'Tab'); await wait(250);
  ok(/about \$55 extra/.test(await p.textContent('#hrBody')), 'multiplier 2 doubles the premium: ' + (await p.textContent('#hrBody')).slice(0, 600));
  await p.fill('#hrOt', '70'); await p.press('#hrOt', 'Tab'); await wait(250);
  ok(!/All your jobs together/.test(await p.textContent('#hrBody')), 'raising the combined limit removes that warning');
  ok((await st(p)).hrcfg.find((x) => x.id === 'cfg').ot === 70, 'combined limit saved');
  await p.fill('#hrRest', '6'); await p.press('#hrRest', 'Tab'); await wait(250);
  ok(!/7\.5 h of rest/.test(await p.textContent('#hrBody')), 'rest hours setting is used');
  // next week navigation
  await p.click('[data-hrnav="1"]'); await wait(200);
  ok(/Week of Nov 8/.test(await p.textContent('#hrWk')) && /No job shifts this week/.test(await p.textContent('#hrBody')), 'next week is empty');
  await p.click('#hrDlg [data-close]'); await wait(200);
  card = await p.textContent('#hrCard');
  ok(/Limit 70 h/.test(card) && !/days in a row/.test(card) === false, 'card follows the settings: ' + card);
  // nothing scheduled: no card
  const e2 = await open(b, { now, state: { ...state, events: [] } });
  ok(!(await e2.p.locator('#hrCard').count()), 'no card when nothing is scheduled');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await p.evaluate(() => { location.hash = '#hours'; }); await wait(400);
  const w2 = await p.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('#hrDlg .dlg').scrollWidth, document.querySelector('#hrDlg .dlg').clientWidth]); ok(w2[0] <= 390 && w2[1] <= w2[2], 'sheet fits the phone ' + w2);
  await p.screenshot({ path: '/tmp/hours.png' });
  await ctx.close(); await e2.ctx.close(); await b.close();
  const all = [...errs, ...pe, ...e2.errs];
  if (all.length) { console.log('FAIL', all); process.exit(1); } console.log('HOURS OK');
})();
