// Availability and time off: node planner/tests/avail.test.js  (serve the site first, PORT env, default 8785; see shifts.test.js)
process.env.PORT = process.env.PORT || '8785';
const { chromium } = require('playwright');
const { wait, open, st } = require('./lib-fin');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime(); // Tuesday 10am in New York; next week starts Sun Nov 8
  const ev = (id, cat, date, start, end, allDay = false, title = 'Shift') => ({ id, title, cat, date, allDay, start, end, endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] });
  const state = {
    v: 1, view: 'today', weekStart: 0,
    jobs: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 10, days: [] }, { id: 'job-electric', name: 'Electric', color: '#ca8a04', start: '07:00', end: '15:30', rate: 30, days: [] }],
    categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'job-electric', name: 'Electric', color: '#ca8a04' }, { id: 'personal', name: 'Personal', color: '#64748b' }],
    events: [
      ev('el', 'job-electric', '2026-11-09', '07:00', '15:30'), // Mon
      ev('dn', 'personal', '2026-11-10', '14:00', '15:00', false, 'Dentist'), // Tue afternoon
      ev('ob', 'job-outback', '2026-11-11', '16:00', '22:00'), // Wed: the job itself never blocks it
      ev('vc', 'personal', '2026-11-13', '', '', true, 'Vacation'), // Fri all day
    ],
  };
  const { ctx, p, errs: pe } = await open(b, { now, state, hash: '#availability' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  ok(await p.isVisible('#avDlg'), '#availability opens the sheet');
  ok(/Week of Nov 8/.test(await p.textContent('#avWk')), 'defaults to next week');
  let msg = await p.inputValue('#avMsg');
  ok(/^Hi, here is my availability for Outback Steakhouse the week of Nov 8:/.test(msg), 'intro: ' + msg);
  ok(/Sun Nov 8: any time/.test(msg), 'open day: ' + msg);
  ok(/Mon Nov 9: 5pm-close \(Electric 7am-3:30pm\)/.test(msg), 'other job marks Monday busy and says why: ' + msg);
  ok(/Tue Nov 10: 6am-12pm and 5pm-close \(Dentist 2pm-3pm\)/.test(msg), 'own event blocks the afternoon: ' + msg);
  ok(/Wed Nov 11: any time/.test(msg), 'the same job does not block itself');
  ok(/Fri Nov 13: unavailable \(Vacation\)/.test(msg), 'all-day vacation marks the whole day: ' + msg);
  ok(await p.locator('#avGrid .c.busy').count() >= 4, 'busy cells are drawn in red');
  // edit the grid: Thursday evenings only, a note on Saturday, evening starts at 4pm, manager's name
  await p.click('[data-avc="4|m"]'); await p.click('[data-avc="4|a"]');
  await p.fill('[data-avn="6"]', 'church until noon');
  await p.selectOption('#avEve', '16'); await wait(150);
  await p.fill('#avMgr', 'Sam'); await wait(150);
  msg = await p.inputValue('#avMsg');
  ok(/^Hi Sam, here is my availability/.test(msg), 'uses the manager name');
  ok(/Thu Nov 12: 4pm-close/.test(msg), 'Thursday 4pm-close: ' + msg);
  ok(/Sat Nov 14: any time \(church until noon\)/.test(msg), 'day note is kept: ' + msg);
  ok(/Mon Nov 9: 4pm-close/.test(msg), 'Monday now 4pm-close: ' + msg);
  const it = (await st(p)).avail.find((x) => x.id === 'job-outback');
  ok(it && it.g['4'] === 'e' && it.n['6'] === 'church until noon' && it.mgr === 'Sam' && it.eve === 16, 'grid saved in the synced collection: ' + JSON.stringify(it));
  await p.uncheck('#avWhyChk'); await wait(150);
  ok(/Mon Nov 9: 4pm-close\n/.test(await p.inputValue('#avMsg')), 'reasons can be left out');
  await p.check('#avWhyChk');
  // the other job has its own grid
  await p.click('[data-avj="job-electric"]'); await wait(150);
  ok(/availability for Electric the week of Nov 8/.test(await p.inputValue('#avMsg')) && /Thu Nov 12: any time/.test(await p.inputValue('#avMsg')), 'second job has its own grid');
  await p.click('[data-avj="job-outback"]'); await wait(150);
  // copy
  await p.click('#avCopyBtn'); await wait(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  ok(clip === null || clip === (await p.inputValue('#avMsg')), 'clipboard holds the message');
  // request off Wed-Thu with a reason
  await p.fill('#avFrom', '2026-11-11'); await p.fill('#avTo', '2026-11-12'); await p.fill('#avWhyTxt', 'family event'); await wait(150);
  const rq = await p.inputValue('#avReqMsg');
  ok(/^Hi Sam, could I please request off Wed, Nov 11 to Thu, Nov 12 \(family event\)\?/.test(rq) && /scheduled Wed Nov 11 \(4pm-10pm\)/.test(rq), 'polite message mentions the shift: ' + rq);
  await p.click('#avReqCopy'); await wait(300);
  let s = await st(p);
  ok(s.avreq.length === 1 && s.avreq[0].status === 'sent' && s.avreq[0].from === '2026-11-11' && s.avreq[0].to === '2026-11-12' && s.avreq[0].reason === 'family event', 'request saved as sent: ' + JSON.stringify(s.avreq));
  ok(/waiting|sent today/.test(await p.textContent('#avReqs')), 'list shows it is waiting');
  // approved -> add Day off to the calendar
  await p.click('[data-avst="approved"]'); await wait(250);
  s = await st(p); ok(s.avreq[0].status === 'approved', 'marked approved');
  ok(!s.events.some((e) => e.cat === 'dayoff'), 'nothing is added to the calendar until you tap');
  ok(/Wed Nov 11: unavailable \(day off approved\)/.test(await p.inputValue('#avMsg')), 'approved days off become unavailable in the message: ' + await p.inputValue('#avMsg'));
  await p.click('[data-avcal]'); await wait(300);
  s = await st(p);
  const off = s.events.find((e) => e.cat === 'dayoff');
  ok(off && off.title === 'Day off' && off.allDay && off.date === '2026-11-11' && off.endDate === '2026-11-12' && s.avreq[0].evId === off.id, 'Day off event added: ' + JSON.stringify(off));
  ok(s.categories.some((c) => c.id === 'dayoff'), 'Day off type created');
  ok(/Wed Nov 11: unavailable/.test(await p.inputValue('#avMsg')), 'still unavailable once on the calendar');
  // the Electric grid is not blocked by an Outback day off
  await p.click('[data-avj="job-electric"]'); await wait(150);
  ok(/Wed Nov 11: 6am-12pm \(Outback Steakhouse 4pm-10pm\)/.test(await p.inputValue('#avMsg')), 'a day off from Outback does not block Electric, its shift does: ' + await p.inputValue('#avMsg'));
  await p.click('[data-avj="job-outback"]'); await wait(150);
  // denied after approval asks to remove the day off
  await p.click('[data-avst="denied"]'); await wait(200);
  ok(await p.isVisible('#askDlg'), 'asks before removing the Day off'); await p.click('#askYes'); await wait(300);
  s = await st(p); ok(s.avreq[0].status === 'denied' && !s.events.some((e) => e.cat === 'dayoff') && !s.avreq[0].evId, 'denied removes the Day off');
  // Today card
  await p.click('#avDlg [data-close]'); await wait(200);
  await p.click('[data-avst]', { trial: true }).catch(() => {});
  const card = await p.textContent('#avCard');
  ok(/Copy for Outback Steakhouse, week of Nov 8/.test(card), 'Today card has a one-tap copy: ' + card);
  // delete
  await p.evaluate(() => { location.hash = '#availability'; }); await wait(400);
  await p.click('[data-avrdel]'); await wait(200); await p.click('#askYes'); await wait(300);
  ok((await st(p)).avreq.length === 0, 'request deleted');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  const w2 = await p.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('#avDlg .dlg').scrollWidth, document.querySelector('#avDlg .dlg').clientWidth]); ok(w2[0] <= 390 && w2[1] <= w2[2], 'sheet fits the phone ' + w2);
  await p.screenshot({ path: '/tmp/avail.png' });
  await ctx.close(); await b.close();
  const all = [...errs, ...pe];
  if (all.length) { console.log('FAIL', all); process.exit(1); } console.log('AVAIL OK');
})();
