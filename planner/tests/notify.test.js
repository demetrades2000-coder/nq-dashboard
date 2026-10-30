// Notifications and widgets: daily reminders in the calendar file, the app-icon number. node planner/tests/notify.test.js (PORT default 8777)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.addInitScript(() => { window.__badge = null; navigator.setAppBadge = (n) => { window.__badge = n; return Promise.resolve(); }; navigator.clearAppBadge = () => { window.__badge = 0; return Promise.resolve(); }; });
  await p.clock.setFixedTime(new Date('2026-11-04T08:00:00'));
  await p.goto(URL + '#today'); await wait(1800);
  ok(typeof (await p.evaluate(() => window.__badge)) === 'number' && (await p.evaluate(() => window.__badge)) >= 1, 'the icon number shows things that need you: ' + await p.evaluate(() => window.__badge));
  await p.goto(URL + '#alerts'); await wait(800);
  ok(await p.isVisible('#alDlg') && /Daily reminders/.test(await p.textContent('#alBody')) && /Home Screen and Lock Screen/.test(await p.textContent('#alBody')), 'sheet has reminders and the widget how-to');
  const getIcs = async () => { const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#alSave')]); const path = await dl.path(); return require('fs').readFileSync(path, 'utf8').replace(/\r\n /g, ''); };
  let ics = await getIcs();
  ok((ics.match(/SUMMARY:Drink water/g) || []).length === 6, 'six water reminders');
  ok(/SUMMARY:Set your trade plan[\s\S]*?RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR/.test(ics), 'trade plan on weekdays only');
  ok(/SUMMARY:Weekly review[\s\S]*?BYDAY=SU/.test(ics), 'weekly review on Sundays');
  // change water to every 3 hours, turn dinner off
  await p.selectOption('[data-alwint]', '3'); await wait(200);
  await p.uncheck('[data-alrem="dinner"]'); await wait(200);
  ics = await getIcs();
  ok((ics.match(/SUMMARY:Drink water/g) || []).length === 4, 'water every 3 h is four events: ' + (ics.match(/SUMMARY:Drink water/g) || []).length);
  ok(!/SUMMARY:Log your dinner/.test(ics), 'dinner reminder off');
  const cfg = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).alcfg.find((x) => x.id === 'cfg'));
  ok(cfg.waterEvery === 3 && cfg.rem_dinner === false, 'settings saved ' + JSON.stringify(cfg));
  // badge off clears it
  await p.uncheck('[data-albadge]'); await wait(300); ok((await p.evaluate(() => window.__badge)) === 0, 'badge cleared when switched off');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  const small = await p.evaluate(() => [...document.querySelectorAll('#alDlg input[type=time],#alDlg select')].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).length); ok(small === 0, 'inputs under 16px: ' + small);
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('NOTIFY OK');
})();
