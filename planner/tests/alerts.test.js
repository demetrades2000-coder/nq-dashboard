// Phone alerts (.ics with reminders): node planner/tests/alerts.test.js  (serve the site first, PORT env, default 8784; see shifts.test.js)
process.env.PORT = process.env.PORT || '8784';
const fs = require('fs');
const { chromium } = require('playwright');
const { wait, nqCache, open, st } = require('./lib-money');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime(); // Tuesday 10am New York
  const longTitle = 'Café meeting with the electrician about the panel upgrade at the Henderson house, bring the load calc';
  const state = {
    v: 1, view: 'today', weekStart: 0,
    categories: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c' }, { id: 'personal', name: 'Personal', color: '#64748b' }, { id: 'deadline', name: 'Deadline', color: '#dc2626' }],
    jobs: [{ id: 'job-outback', name: 'Outback Steakhouse', color: '#b91c1c', start: '16:00', end: '22:00', rate: 5, days: [5] }],
    events: [
      { id: 'ev1', title: 'Call; Sam, now', cat: 'personal', date: '2026-11-03', allDay: false, start: '14:00', end: '15:00', endDate: '', repeat: 'weekly', until: '', notes: 'line1\nline2', proj: '', ex: ['2026-11-10'] },
      { id: 'sh1', title: 'Outback Steakhouse', cat: 'job-outback', date: '2026-11-06', allDay: false, start: '16:00', end: '22:00', endDate: '', repeat: 'weekly', until: '2026-12-31', notes: '', proj: '', ex: [] },
      { id: 'dl1', title: 'Permit deadline', cat: 'deadline', date: '2026-11-05', allDay: true, start: '', end: '', endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] },
      { id: 'lt1', title: longTitle, cat: 'personal', date: '2026-11-04', allDay: false, start: '09:00', end: '10:00', endDate: '', repeat: 'none', until: '', notes: '', proj: '', ex: [] },
    ],
    bills: [{ id: 'b1', name: 'Rent', amt: 1200, freq: 'monthly', day: 6, ymd: '2026-11-06' }],
    deals: [{ id: 'd1', name: 'Sam lead', kind: 'lead', stage: 'lead', value: 500, follow: '2026-11-05', notes: '', created: 1 }],
  };
  const seed = nqCache(now);
  seed.doc.events = [{ id: 'news-2026-11-04-0830', title: 'CPI', type: 'trading', date: '2026-11-04', start: '08:30', end: '09:00', notes: '', project: 'nq', layer: 'high', color: '#dc2626' }];
  const { p, errs: pe } = await open(b, { now, seed, state, hash: '#alerts' });
  ok(await p.isVisible('#alDlg'), '#alerts opens the sheet');
  const how = await p.textContent('#alHow');
  ok(/Add All/.test(how) && /calendar/i.test(how), 'import steps are explained: ' + how);
  ok(await p.isVisible('#alOpenBtn', { timeout: 100 }).catch(() => false) || (await p.locator('#alOpenBtn').count()) === 1, 'button next to Calendar alerts');
  const exportIcs = async () => { const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#alSave')]); return fs.readFileSync(await dl.path(), 'utf8'); };
  const txt = await exportIcs();
  const lines = txt.split('\r\n');
  const cnt = (re) => (txt.match(re) || []).length;
  ok(cnt(/BEGIN:VCALENDAR/g) === 1 && cnt(/END:VCALENDAR/g) === 1, 'one calendar');
  const nEv = cnt(/BEGIN:VEVENT\r\n/g);
  ok(nEv === cnt(/END:VEVENT\r\n/g) && nEv > 20, 'balanced events: ' + nEv);
  ok(cnt(/BEGIN:VALARM\r\n/g) === cnt(/END:VALARM\r\n/g) && cnt(/BEGIN:VALARM\r\n/g) === nEv, 'one VALARM per event');
  ok(!/[^\r]\n/.test(txt) && txt.endsWith('\r\n'), 'CRLF line endings only');
  ok(lines.every((l) => Buffer.byteLength(l, 'utf8') <= 75), 'every line is at most 75 octets: ' + lines.filter((l) => Buffer.byteLength(l, 'utf8') > 75)[0]);
  const unfolded = txt.replace(/\r\n /g, '');
  ok(unfolded.includes('SUMMARY:' + longTitle.replace(/,/g, '\\,')), 'long title with an accented letter survives folding');
  const uidOf = (t) => (t.match(/^UID:.*$/gm) || []).map((s) => s.trim());
  const uids = uidOf(unfolded);
  ok(uids.length === nEv && uids.length === new Set(uids).size, 'UIDs are unique');
  ok(uids.every((u) => /@planner$/.test(u) && /^UID:al-/.test(u)), 'UIDs are stable and prefixed');
  ok(!/DTSTART[^:\r]*:\d{8}T\d{6}Z/.test(unfolded) && !/TZID/.test(unfolded), 'floating local times (no Z, no TZID)');
  ok(/X-WR-CALNAME:Planner alerts/.test(txt), 'separate calendar name');
  ok(unfolded.includes('SUMMARY:Call\\; Sam\\, now') && unfolded.includes('DESCRIPTION:line1\\nline2'), 'escaping');
  ok(unfolded.includes('DTSTART:20261103T140000') && unfolded.includes('DTSTART:20261117T140000') && !unfolded.includes('DTSTART:20261110T140000'), 'weekly event expanded, skipped day left out');
  ok(!/RRULE|EXDATE/.test(unfolded), 'no RRULE (occurrences are expanded)');
  const ev = (uidPart) => { const i = unfolded.indexOf('UID:' + uidPart); if (i < 0) return ''; return unfolded.slice(i, unfolded.indexOf('END:VEVENT', i)); };
  ok(/TRIGGER:-PT10M/.test(ev('al-own-ev1-2026-11-03@')), 'own event 10 minutes before');
  const shifts = unfolded.match(/^UID:al-shift-sh1-.*$/gm) || [];
  ok(shifts.length === 8, 'eight Friday shifts in the window: ' + shifts.length);
  ok(/DTSTART:20261106T160000/.test(ev('al-shift-sh1-2026-11-06@')) && /TRIGGER:-PT1H30M/.test(ev('al-shift-sh1-2026-11-06@')), 'shift 90 min before');
  ok(!unfolded.includes('al-shift-sh1-2027-01-01'), 'shift until date respected');
  const bill = ev('al-bill-bill:b1:2026-11-06-2026-11-06@');
  ok(/DTSTART;VALUE=DATE:20261106/.test(bill) && /TRIGGER:-PT15H/.test(bill) && /Rent/.test(bill) && /due tomorrow/.test(bill), 'bill: day before at 9am: ' + bill);
  ok(unfolded.includes('al-bill-bill:b1:2026-12-06-2026-12-06@'), 'next month bill too');
  const fu = ev('al-fu-fu:d1-2026-11-05@');
  ok(/Follow up: Sam lead/.test(fu) && /TRIGGER:PT9H/.test(fu), 'follow-up at 9am: ' + fu);
  ok(/TRIGGER:PT9H/.test(ev('al-own-dl1-2026-11-05@')), 'all-day event 9am');
  const news = ev('al-news-bot:nq-dashboard:news-2026-11-04-0830');
  ok(/TRIGGER:-PT15M/.test(news) && /DTSTART:20261104T083000/.test(news), 'high-impact news 15 min before: ' + news);
  ok(/DTSTART:20261104T093000/.test(ev('al-sess-NY_AM-2026-11-04@')) && /TRIGGER:-PT15M/.test(ev('al-sess-NY_AM-2026-11-04@')), 'NY AM session 15 min before');
  ok(!unfolded.includes('al-sess-NY_AM-2026-11-07'), 'no session on Saturday');
  const again = uidOf((await exportIcs()).replace(/\r\n /g, ''));
  ok(JSON.stringify(again) === JSON.stringify(uids), 're-export has the same UIDs (re-import updates)');
  await p.selectOption('[data-alsel="shiftLead"]', '60'); await wait(100);
  await p.uncheck('[data-alon="bill"]'); await wait(100);
  const cfg = (await st(p)).alcfg.find((x) => x.id === 'cfg');
  ok(cfg && cfg.shiftLead === 60 && cfg.bill === false && cfg.last > 0, 'settings saved in the synced collection ' + JSON.stringify(cfg));
  const t2 = (await exportIcs()).replace(/\r\n /g, '');
  ok(!/al-bill-/.test(t2) && /TRIGGER:-PT1H\r\n/.test(t2) && !/TRIGGER:-PT1H30M/.test(t2), 'bills off, shifts 1 hour before');
  await p.selectOption('[data-alsel="newsLead"]', '30'); await p.uncheck('[data-alon="sess"]'); await wait(100);
  const t3 = (await exportIcs()).replace(/\r\n /g, '');
  ok(!/al-sess-/.test(t3) && /TRIGGER:-PT30M/.test(t3), 'sessions off, news lead 30');
  await p.check('[data-alon="bill"]'); await p.selectOption('[data-alsel="billDays"]', '3'); await p.fill('[data-alsel="billAt"]', '07:30'); await p.press('[data-alsel="billAt"]', 'Tab'); await wait(150);
  const t4 = (await exportIcs()).replace(/\r\n /g, '');
  ok(/TRIGGER:-PT64H30M/.test(t4), '3 days before at 7:30 = 64h30m before midnight');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll in the sheet');
  await p.screenshot({ path: '/tmp/alerts-sheet.png' });
  await p.click('#alDlg [data-close]');
  ok(/Phone alerts/.test(await p.textContent('#alCard')), 'Today card');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on Today');
  ok(pe.length === 0, 'no page errors: ' + pe.join(' | '));
  await b.close();
  if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); } console.log('ALERTS OK');
})().catch((e) => { console.error(e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
