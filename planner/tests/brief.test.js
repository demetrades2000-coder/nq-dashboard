// Daily brief: node planner/tests/brief.test.js  (serve the site first, PORT env, default 8784; see shifts.test.js)
process.env.PORT = process.env.PORT || '8784';
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, open, st } = require('./lib-money');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T13:00:00Z').getTime(); // Tuesday 8am New York
  const state = {
    v: 1, view: 'today', weekStart: 0,
    categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'personal', name: 'Personal', color: '#64748b' }],
    jobs: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 5, days: [] }],
    events: [
      { id: 'sh1', title: 'Outback Steakhouse', cat: 'job-outback', date: '2026-11-03', allDay: false, start: '16:00', end: '22:00', endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] },
      { id: 'c1', title: 'Call <b>Sam</b>', cat: 'personal', date: '2026-11-03', allDay: false, start: '12:00', end: '12:30', endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] },
    ],
    tasks: [{ id: 't1', title: 'Order breaker panel', date: '2026-11-03', done: false, p: 3, created: 1 }, { id: 't2', title: 'Old thing', date: '2026-11-01', done: false, p: 0, created: 2 }, { id: 't3', title: 'Done thing', date: '2026-11-03', done: true, p: 0, created: 3 }],
    bills: [{ id: 'b1', name: 'Rent', amt: 1200, freq: 'monthly', day: 5, ymd: '2026-11-05' }, { id: 'b2', name: 'Far bill', amt: 50, freq: 'monthly', day: 20, ymd: '2026-11-20' }],
    deals: [{ id: 'd1', name: 'Sam lead', kind: 'lead', stage: 'lead', value: 500, follow: '2026-11-02', notes: '', created: 1 }, { id: 'd2', name: 'Later deal', kind: 'lead', stage: 'lead', value: 0, follow: '2026-11-09', notes: '', created: 2 }],
    journal: [{ id: 'j:2026-11-02', date: '2026-11-02', note: '', mood: 0, rules: '', win: 'Waited for the setup and passed on 2 bad trades' }],
    tplan: [{ id: 'tp:2026-11-03', date: '2026-11-03', bias: 'long', setup: 'Asia low sweep', max: 2 }],
  };
  const seed = nqCache(now, { news: [{ date: '2026-11-03', time: '08:30', impact: 'high', title: 'CPI y/y' }, { date: '2026-11-03', time: '10:00', impact: 'med', title: 'JOLTS' }] });
  const { ctx, p, errs: pe } = await open(b, { now, seed, state, hash: '#brief' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  ok(await p.isVisible('#brDlg'), '#brief opens the sheet');
  const body = await p.textContent('#brBody');
  ok(/Outback Steakhouse \(shift\)/.test(body) && /Call <b>Sam<\/b>/.test(body), 'schedule shown, user text escaped: ' + body.slice(0, 200));
  ok(!(await p.locator('#brBody b').count()), 'no HTML injected from titles');
  ok(/Trading windows/.test(body) && /NY AM: free/.test(body), 'trading windows from the guard block');
  ok(/CPI y\/y \(high impact\)/.test(body) && /JOLTS/.test(body), 'news windows');
  ok(/Rent \$1,200, in 2 days/.test(body) && !/Far bill/.test(body), 'bills due in 3 days only');
  ok(/Sam lead.*1 day late overdue|Sam lead.*yesterday overdue/.test(body) && !/Later deal/.test(body), 'deal follow-up due: ' + body);
  ok(/Order breaker panel/.test(body) && !/Done thing/.test(body) && /1 overdue task/.test(body), 'tasks due today plus overdue count');
  ok(/Trade plan: bias long, setup "Asia low sweep", max 2 trades/.test(body) && /Tilt guard: no stop hit/.test(body), 'plan and tilt status');
  ok(/Yesterday's win/i.test(body) && /Waited for the setup/.test(body), "yesterday's win from the journal");
  const text = await p.evaluate(() => document.querySelector('#brDlg').dataset.text);
  ok(/^BRIEF FOR /.test(text) && /\nTODAY\n- 12pm-12:30pm Call <b>Sam<\/b>/.test(text) && !/<section|&lt;/.test(text), 'plain text version: ' + text.slice(0, 300));
  // copy
  await p.click('#brCopy'); await wait(200);
  ok(/copied/i.test(await p.textContent('#toastMsg')), 'copy toast: ' + await p.textContent('#toastMsg'));
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => null));
  ok(clip === null || clip === text, 'clipboard holds the brief');
  // share with navigator.share
  await p.evaluate(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d; }; });
  await p.click('#brShare'); await wait(150);
  const sh = await p.evaluate(() => window.__shared);
  ok(sh && sh.text === text && sh.title, 'share passes the text to the share sheet');
  // share cancelled: no copy fallback
  await p.evaluate(() => { navigator.share = async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; }; });
  await p.evaluate(() => { document.querySelector('#toastMsg').textContent = ''; });
  await p.click('#brShare'); await wait(150);
  ok(!(await p.textContent('#toastMsg')), 'cancelling the share sheet does nothing else');
  // fallback to copy when share is missing
  await p.evaluate(() => { navigator.share = undefined; });
  await p.click('#brShare'); await wait(200);
  ok(/copied/i.test(await p.textContent('#toastMsg')), 'no navigator.share: copies instead');
  await p.screenshot({ path: '/tmp/brief-sheet.png' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
  await p.click('#brDlg [data-close]');
  ok(/Brief/.test(await p.textContent('#brCard')) && /on the schedule/.test(await p.textContent('#brCard')), 'Today card');
  await expand(p, 'brief'); await p.click('[data-bropen]'); ok(await p.isVisible('#brDlg'), 'card opens the sheet');
  ok(pe.length === 0, 'no page errors: ' + pe.join(' | '));
  await ctx.close();
  // empty state degrades gracefully: no data at all
  const c2 = await open(b, { now, seed: null, state: { v: 1, view: 'today' }, hash: '#brief' });
  ok(await c2.p.isVisible('#brDlg') && !/Today\n|Call/.test(await c2.p.textContent('#brBody')) && /Trade plan: not written yet/.test(await c2.p.textContent('#brBody')), 'empty data: only the status sections appear');
  ok(c2.errs.length === 0, 'no page errors when empty: ' + c2.errs.join(' | '));
  await b.close();
  if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); } console.log('BRIEF OK');
})().catch((e) => { console.error(e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
