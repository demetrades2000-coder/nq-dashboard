// Conflict guard, trading windows, bedtime planner: node planner/tests/guard.test.js
// Serve the site first (see shifts.test.js); this test uses port 8778 and fixes the clock and time zone so it is repeatable.
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8778/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch();
  const ev = (id, title, date, start, end, x = {}) => ({ id, title, cat: 'personal', date, allDay: false, start, end, endDate: '', repeat: 'none', until: '', notes: '', ex: [], ...x });
  const nq = {
    t: 0, pnl: {}, trades: [],
    doc: {
      bot: 'NQ bots', tz: 'ET', kz: ['09:30-11:30', '13:30-15:30'], trade: { plans: {}, accounts: [] },
      news: { built: '', events: [], headlines: [], earnings: [], srcBad: [] },
      events: [
        { id: 'n1', title: 'CPI · bot paused', type: 'trading', date: '2026-10-29', start: '13:50', end: '14:20', layer: 'high' },
        { id: 'n2', title: 'PPI · bot paused', type: 'trading', date: '2026-10-30', start: '08:25', end: '09:45', layer: 'high' },
      ],
    },
  };
  const seed = {
    events: [
      ev('d1', 'Dentist', '2026-10-29', '10:00', '10:30'),
      ev('p1', 'Early call', '2026-10-29', '07:00', '08:00'),
      ev('p2', 'Electric', '2026-10-29', '07:30', '09:00', { cat: 'job-electric' }), // overlaps Early call but is already over at 9:00
      ev('f1', 'Electric', '2026-10-30', '07:00', '15:30', { cat: 'job-electric' }),
      ev('f2', 'Dentist 2', '2026-10-30', '15:00', '16:00'),
      ev('f3', 'Outback Steakhouse', '2026-10-30', '16:00', '22:00', { cat: 'job-outback' }), // touches Dentist 2 only at 16:00: not an overlap
      ev('f4', 'Holiday', '2026-10-30', '', '', { allDay: true }),
      ev('s1', 'Outback Steakhouse', '2026-10-31', '12:00', '20:00', { cat: 'job-outback' }),
      ev('s2', 'Outback Steakhouse', '2026-10-31', '18:00', '22:00', { cat: 'job-outback' }),
      ev('s3', 'Birthday', '2026-10-31', '', '', { allDay: true }),
    ],
  };
  const open = async (iso, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: opts.tz || 'America/New_York', hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errs.push('console ' + m.text()); });
    await p.clock.setFixedTime(new Date(iso));
    await p.addInitScript(({ seed, nq }) => { if (localStorage.getItem('planner.v1')) return; localStorage.setItem('planner.v1', JSON.stringify({ ...seed, view: 'today' })); nq.t = Date.now(); localStorage.setItem('planner.nq', JSON.stringify(nq)); }, { seed, nq });
    await p.goto(URL); await p.waitForSelector('.tdy'); await wait(400);
    return { ctx, p };
  };
  const text = (p, sel) => p.textContent(sel);

  // ---------- Thursday 9:00 ET ----------
  let { ctx, p } = await open('2026-10-29T09:00:00-04:00');
  let ban = await text(p, '.gd-ban');
  ok(/double-booked/.test(ban) && /trading clash/.test(ban), 'banner counts both kinds: ' + ban);
  ok(await p.locator('.gd-ban.red').count() === 1, 'banner is red when something is double-booked');
  await p.click('.gd-ban');
  ok(await p.isVisible('#gdDlg'), 'Check my week sheet opens');
  const sheet = await text(p, '#gdBody');
  ok(/Electric 7am–3:30pm overlaps Dentist 2 3pm–4pm/.test(sheet), 'shift vs meeting overlap: ' + sheet.slice(0, 400));
  ok(/Outback Steakhouse 12pm–8pm overlaps Outback Steakhouse 6pm–10pm/.test(sheet), 'shift vs shift overlap');
  ok(/Electric 7am–3:30pm covers NY AM session \(9:30am–11:30am\)/.test(sheet), 'shift covers NY AM');
  ok(/ends during NY PM session \(1:30pm–3:30pm\)/.test(sheet), 'shift ends during NY PM');
  ok(/the PPI bot pause \(8:25am–9:45am\)/.test(sheet), 'shift vs news pause wording');
  ok(!/Early call/.test(sheet) && !/Electric 7:30am/.test(sheet), 'overlap that is already over today is not reported');
  ok(!/Holiday|Birthday/.test(sheet), 'all-day events are never in a conflict');
  ok(!/Outback Steakhouse 4pm–10pm/.test(sheet), 'back-to-back events do not conflict');
  ok(/Tomorrow/.test(sheet) && /Sat, Oct 31/.test(sheet), 'grouped by day');
  ok(/Best free block/.test(sheet), 'deep work block in the sheet');
  ok(await p.locator('.gd-row.red').count() === 2 && await p.locator('.gd-row.amber').count() >= 3, 'red and amber rows');
  // tap-through
  await p.click('.gd-row.red .gd-main >> nth=0');
  ok(!(await p.isVisible('#gdDlg')) && await p.isVisible('#evDlg'), 'tapping an issue opens the event');
  ok(['Electric', 'Dentist 2', 'Outback Steakhouse'].includes(await p.inputValue('#fTitle')), 'it is the right event: ' + await p.inputValue('#fTitle'));
  await p.keyboard.press('Escape');

  // trading windows (9:00 ET Thursday)
  const tw = await text(p, '#gdTrade');
  ok(/NY AM 9:30am–10am free/.test(tw) && /NY AM 10:30am–11:30am free/.test(tw), 'AM free around the dentist: ' + tw);
  ok(/NY AM partly taken by Dentist/.test(tw), 'says what took the time');
  ok(/NY PM 1:30pm–1:50pm free/.test(tw) && /NY PM 2:20pm–3:30pm free/.test(tw) && /partly taken by the news pause/.test(tw), 'PM free around the news pause');
  ok(/3h free/.test(tw), 'total free time: ' + tw);
  ok(/Best deep-work block this week/.test(tw), 'best block on Today');
  ok(await p.locator('.gd-bed').count() === 0, 'no bedtime card in the morning');
  // plan day sheet carries the bedtime line
  await p.click('[data-tplan]'); await wait(150);
  const pb = await text(p, '#planBed');
  ok(/Tonight: Be asleep by 10:15 PM, wake 6:15 AM/.test(pb), 'plan sheet bedtime line: ' + pb);
  await p.keyboard.press('Escape');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll on Today');
  await p.screenshot({ path: '/tmp/guard-today.png', fullPage: true });
  await ctx.close();

  // ---------- Thursday 20:00 ET: bedtime card ----------
  ({ ctx, p } = await open('2026-10-29T20:00:00-04:00'));
  const bed = await text(p, '#gdBed');
  ok(/Be asleep by 10:15 PM, wake 6:15 AM/.test(bed), 'bedtime from tomorrow\'s first shift: ' + bed);
  ok(/First up: Electric at 7am\. 45 min to get ready, 8 h of sleep/.test(bed), 'bedtime explains itself');
  ok(/NY PM is over/.test(await text(p, '#gdTrade')) && /NY AM is over/.test(await text(p, '#gdTrade')), 'finished sessions say so');
  // edit the settings
  await p.click('#gdBed [data-gbed]'); ok(await p.isVisible('#gbDlg'), 'settings open');
  ok(await p.inputValue('#gbBuf') === '45' && await p.inputValue('#gbSleep') === '8', 'defaults 45 min and 8 h');
  const fs = await p.evaluate(() => ['#gbBuf', '#gbSleep', '#gbTrade'].map((s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize)));
  ok(fs.every((x) => x >= 16), 'inputs are 16px: ' + fs);
  await p.fill('#gbBuf', '60'); await p.fill('#gbSleep', '7.5'); await p.press('#gbSleep', 'Tab'); await wait(150);
  ok(/Be asleep by 10:30 PM, wake 6:00 AM/.test(await text(p, '#gdBed')), 'new settings apply at once: ' + await text(p, '#gdBed'));
  let st = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).guard);
  ok(st.length === 1 && st[0].id === 'bed' && st[0].buffer === 60 && st[0].sleep === 7.5 && st[0].u > 0, 'saved in the synced collection with a timestamp: ' + JSON.stringify(st));
  await p.selectOption('#gbTrade', 'ldn'); await wait(150);
  ok(/Be asleep by 6:30 PM, wake 2:00 AM/.test(await text(p, '#gdBed')) && /London session at 3am/.test(await text(p, '#gdBed')), 'a marked trading session counts as a commitment: ' + await text(p, '#gdBed'));
  ok(/That time has passed/.test(await text(p, '#gdBed')), 'tells you when bedtime already passed');
  await p.click('#gbDlg .btn.primary'); ok(!(await p.isVisible('#gbDlg')), 'Done closes settings');
  await p.reload(); await p.waitForSelector('.tdy'); await wait(300);
  ok(/Be asleep by 6:30 PM, wake 2:00 AM/.test(await text(p, '#gdBed')), 'settings survive a reload');
  await ctx.close();

  // ---------- Friday 8:00 ET: everything blocked ----------
  ({ ctx, p } = await open('2026-10-30T08:00:00-04:00'));
  const fr = await text(p, '#gdTrade');
  ok(/NY AM blocked by Electric shift and the news pause/.test(fr), 'AM blocked by the shift: ' + fr);
  ok(/NY PM blocked by Electric shift/.test(fr), 'PM blocked by the shift');
  ok(/no free time/.test(fr), 'no free time summary');
  ok(/overlaps Dentist 2/.test(await text(p, '.gd-ban')), 'Friday banner shows the overlap');
  await ctx.close();

  // ---------- Saturday: markets closed, no false alarms from killzones ----------
  ({ ctx, p } = await open('2026-10-31T07:00:00-04:00'));
  ok(/US markets are closed today/.test(await text(p, '#gdTrade')), 'weekend says markets closed');
  ok(/double-booked/.test(await text(p, '.gd-ban')) && !/trading clash/.test(await text(p, '.gd-ban')), 'weekend shifts only conflict with each other');
  await ctx.close();

  // ---------- Quiet week: green ----------
  {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' });
    const q = await c2.newPage(); q.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    await q.clock.setFixedTime(new Date('2026-10-29T09:00:00-04:00'));
    await q.addInitScript(({ nq }) => { if (localStorage.getItem('planner.v1')) return; localStorage.setItem('planner.v1', JSON.stringify({ view: 'today', events: [{ id: 'a', title: 'Gym', cat: 'personal', date: '2026-10-29', allDay: false, start: '18:00', end: '19:00', endDate: '', repeat: 'none', until: '', notes: '', ex: [] }] })); nq.t = Date.now(); nq.doc.events = []; localStorage.setItem('planner.nq', JSON.stringify(nq)); }, { nq });
    await q.goto(URL); await q.waitForSelector('.tdy'); await wait(300);
    ok(/No clashes/.test(await text(q, '.gd-ban.ok')), 'calm week shows the all-clear');
    ok(/NY AM 9:30am–11:30am free/.test(await text(q, '#gdTrade')) && /NY PM 1:30pm–3:30pm free/.test(await text(q, '#gdTrade')), 'full windows free');
    await q.click('#guardBtn'); ok(await q.isVisible('#gdDlg') && /No clashes/.test(await text(q, '#gdBody')), 'header button opens the sheet');
    await c2.close();
  }

  // ---------- Another time zone: sessions convert (Athens: NY AM 4:30pm-6:30pm, NY PM 8:30pm-10:30pm local) ----------
  ({ ctx, p } = await open('2026-10-29T09:00:00-04:00', { tz: 'Europe/Athens' }));
  const at = await text(p, '#gdTrade');
  ok(/NY AM/.test(at) && /NY PM/.test(at), 'sessions show in another time zone: ' + at);
  await ctx.close();

  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('GUARD OK');
})();
