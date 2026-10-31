// Get set up checklist: node planner/tests/setup.test.js  (serve the site first, see shifts.test.js; PORT=... overrides, default 8788)
// Done states come from real data and flip when data is added; Hide for now is remembered; the hub lists it as Setup.
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, open } = require('./lib-money.js');
const NOW = Date.parse('2026-10-14T12:00:00-04:00'); // a Wednesday
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const { ctx, p, errs: pe } = await open(b, { now: NOW, state: { v: 1 } });
  const count = async () => { const t = await p.textContent('#suCardCount').catch(() => ''); return t; };
  const nextTitle = async () => ((await p.textContent('#suCard .su-next b').catch(() => '')) || '').trim();
  const patch = async (fn, arg) => { await p.evaluate(([src, a]) => { const s = JSON.parse(localStorage.getItem('planner.v1')); new Function('s', 'a', src)(s, a); localStorage.setItem('planner.v1', JSON.stringify(s)); }, [fn, arg]); await p.reload(); await wait(1000); };
  await expand(p, 'setup'); ok(await p.isVisible('#suCard'), 'card shows on a fresh install');
  ok(/^0 of 10 done$/.test(await count()), 'fresh: ' + await count());
  ok(/real shift times and hourly pay/.test(await nextTitle()), 'next step is the jobs: ' + await nextTitle());
  ok(await p.$eval('#suCard .prog i', (i) => i.style.width) === '0%', 'progress bar empty');
  // each step flips when its data appears
  const T = '2026-10-14', steps = [
    ['jobs', "s.jobs = [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '15:00', end: '23:00', rate: 5, days: [5, 6] }, { id: 'job-electric', name: 'Electric', color: '#ca8a04', start: '07:00', end: '15:30', rate: 28, days: [1, 2, 3, 4] }];", /Add this week/],
    ['shifts', "s.events = [{ id: 'e1', title: 'Outback', cat: 'job-outback', date: '2026-10-16', allDay: false, start: '15:00', end: '23:00', endDate: '', repeat: 'none', until: '', notes: '' }];", /bills and your balance/],
    ['bills', "s.bills = [{ id: 'b1', name: 'Rent', amt: 900, freq: 'monthly', day: 1, dow: 0, ymd: '2026-10-01', end: '', created: 1 }]; s.cashcfg = [{ id: 'cfg', bal: 1200, balDate: '2026-10-14' }];", /pay schedule/],
    ['payday', "s.paycfg = s.jobs.map((j) => ({ id: j.id, freq: 'weekly', first: '2026-10-16' }));", /tilt guard/],
    ['tilt', "s.tilt = [{ id: 'cfg', maxLoss: 3 }];", /monthly income goal/],
    ['goal', "s.incomegoal = [{ id: 'month', amt: 4000 }];", /weekly time targets/],
    ['targets', "s.budgets = [{ id: 'job-outback', hours: 24 }];", /prop accounts/],
    ['prop', "s.propacct = [{ id: 'p1', firm: 'MFFU', name: '50K', size: 50000, start: '2026-09-01', end: '', status: 'active', split: 90, fees: [], payouts: [], created: 1 }];", /phone alerts/],
    ['alerts', "s.alcfg = [{ id: 'cfg', last: " + NOW + " }];", /backup/i],
  ];
  let n = 0, patchAll = '';
  for (const [id, code, nextRe] of steps) {
    patchAll += code; n++;
    await patch(code);
    ok(new RegExp('^' + n + ' of 10 done$').test(await count()), `after ${id}: ${await count()}`);
    ok(nextRe.test(await nextTitle()), `after ${id} the next step is ${nextRe}: ${await nextTitle()}`);
  }
  ok(await p.$eval('#suCard .prog i', (i) => i.style.width) === '90%', 'progress bar at 90%');
  { const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll at 390px: ' + w); }
  await p.screenshot({ path: '/tmp/setup-phone.png' });
  // a half-done job stays "not done": rate 0 on one job
  await patch("s.jobs[1].rate = 0;");
  ok(/^8 of 10 done$/.test(await count()), 'a job with pay 0 un-does step 1: ' + await count());
  await patch("s.jobs[1].rate = 28;");
  // the last step: Back up
  const dl = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await expand(p, 'setup'); await p.click('#suCard [data-sugo="backup"]'); const got = await dl; await wait(300);
  ok(got && /planner-backup/.test(got.suggestedFilename()), 'Back up now downloads a backup');
  await wait(1600);
  ok(!(await p.isVisible('#suCard')), 'card disappears at 10 of 10');
  await p.click('#hbBtn'); await wait(150);
  ok(/all done/.test(await p.textContent('#hbBody [data-hbtool="setup"]')), 'hub Setup tile says all done');
  await p.keyboard.press('Escape');
  // real UI flips: tilt limits, then a fresh start
  await patch("s.lastBackup = 0; s.tilt = [];");
  ok(/^8 of 10 done$/.test(await count()), 'back to 8 of 10: ' + await count());
  await expand(p, 'setup'); await p.click('#suCard [data-sugo="tilt"]'); await wait(300);
  ok(await p.isVisible('#tsDlg'), 'Next step button opens the tilt guard');
  await p.fill('#tsMax', '3'); await p.press('#tsMax', 'Tab'); await wait(200);
  await p.keyboard.press('Escape'); await wait(300);
  ok(/^9 of 10 done$/.test(await count()), 'saving tilt limits flips step 5: ' + await count());
  // See all steps lists everything and every button opens its tool
  await expand(p, 'setup'); await p.click('#suCard [data-suall]'); await wait(200);
  ok(await p.isVisible('#suDlg') && await p.locator('#suDlg .su-row').count() === 10, 'all 10 steps listed');
  ok(await p.locator('#suDlg .su-row.done').count() === 9 && await p.locator('#suDlg .su-row.next').count() === 1, 'done and next marked');
  const open_ = { jobs: '#shDlg', shifts: '#shDlg', bills: '#bnDlg', payday: '#pdDlg', tilt: '#tsDlg', goal: '#erDlg', targets: '#wbDlg', prop: '#ppDlg', alerts: '#alDlg' };
  for (const [id, sel] of Object.entries(open_)) {
    if (!(await p.isVisible('#suDlg'))) { await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close())); await expand(p, 'setup'); await p.click('#suCard [data-suall]'); await wait(150); }
    await p.click(`#suDlg [data-sugo="${id}"]`); await wait(300);
    ok(await p.isVisible(sel), `step ${id} opens ${sel}`);
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close())); await wait(100);
    await expand(p, 'setup'); await p.click('#suCard [data-suall]'); await wait(150);
  }
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close())); await wait(100);
  // Hide for now is remembered, and the hub keeps Setup
  await expand(p, 'setup'); await p.click('#suCard [data-suhide]'); await wait(300);
  ok(!(await p.isVisible('#suCard')), 'Hide for now hides the card');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).hub.find((x) => x.id === 'cfg').suHide === true), 'hidden flag saved in the synced hub item');
  await p.reload(); await wait(1000);
  ok(!(await p.isVisible('#suCard')), 'still hidden after a reload');
  await p.click('#hbBtn'); await wait(150);
  ok(/9 of 10 done/.test(await p.textContent('#hbBody [data-hbtool="setup"]')), 'hub Setup tile still shows progress');
  await p.click('#hbBody [data-hbtool="setup"]'); await wait(250);
  ok(await p.isVisible('#suDlg') && /Show the card on Today/.test(await p.textContent('#suToggle')), 'Setup tile opens the list with a show button');
  await p.click('#suToggle'); await wait(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).hub.find((x) => x.id === 'cfg').suHide === false), 'show again saved');
  await p.keyboard.press('Escape'); await wait(300);
  await expand(p, 'setup'); ok(await p.isVisible('#suCard'), 'card is back on Today');
  // deep link
  const d = await open(b, { now: NOW, state: { v: 1 }, hash: '#setup' });
  ok(await d.p.isVisible('#suDlg'), '#setup opens the list');
  { const w = await d.p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'setup sheet: no sideways scroll at 390px: ' + w); }
  await d.p.screenshot({ path: '/tmp/setup-sheet.png' });
  ok(d.errs.length === 0, 'deep link page errors: ' + d.errs.join(' | '));
  ok(pe.length === 0, 'page errors: ' + pe.join(' | '));
  await b.close();
  if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); } console.log('SETUP OK');
})().catch((e) => { console.error(e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
