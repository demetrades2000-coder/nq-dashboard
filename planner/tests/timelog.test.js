// Time log + weekly Time Audit: node planner/tests/timelog.test.js  (serve the site first, see shifts.test.js; PORT=... overrides, default 8782)
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8782) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.goto(URL); await wait(1200); await expand(p, 'timelog');
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
  // seed: week starts Sunday. Planned: 6 h of Clipper (two 3 h events), 2 h of Trading. Logged: Clipper 2.5 h, Trading 3.5 h, Personal 3 h (not planned).
  await p.evaluate(() => {
    const pad = (n) => String(n).padStart(2, '0'), key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() - base.getDay());
    const day = (n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
    const at = (n, h, m = 0) => { const d = day(n); d.setHours(h, m, 0, 0); return d.getTime(); };
    const ev = (id, title, cat, proj, n, a, z) => ({ id, title, cat, proj, date: key(day(n)), allDay: false, start: a, end: z, endDate: '', repeat: 'none', until: '', notes: '', ex: [], created: 1 });
    const s = JSON.parse(localStorage.getItem('planner.v1')) || {};
    s.events = [ev('p1', 'Edit clips', 'content', 'clipper', 1, '09:00', '12:00'), ev('p2', 'Edit clips 2', 'content', 'clipper', 2, '09:00', '12:00'), ev('p3', 'NY AM', 'trading', '', 3, '09:30', '11:30')];
    s.timelog = [
      { id: 'l1', title: 'Clipper edit', cat: 'content', proj: 'clipper', start: at(1, 9), end: at(1, 10, 30) },
      { id: 'l2', title: 'Clipper edit', cat: 'content', proj: 'clipper', start: at(2, 9), end: at(2, 10) },
      { id: 'l3', title: 'Trading session', cat: 'trading', proj: '', start: at(3, 9, 30), end: at(3, 13) },
      { id: 'l4', title: 'YouTube', cat: 'personal', proj: '', start: at(4, 14), end: at(4, 17) },
    ];
    s.view = 'today'; s.weekStart = 0; s.timelog.forEach((e) => { e.u = 1; });
    localStorage.setItem('planner.v1', JSON.stringify(s));
  });
  await p.reload(); await wait(1200);
  const todayNow = await p.evaluate(() => new Date().getDay());
  ok(await p.isVisible('#tlCard'), 'Time log card is on Today');
  ok(/What are you working on/.test(await p.getAttribute('#tlCard [name=what]', 'placeholder')), 'asks "What are you working on?"');
  ok((await p.$$('#tlCard [data-tlchip]')).length === 3, 'recent items as one-tap chips (3 different things): ' + (await p.$$('#tlCard [data-tlchip]')).length);
  ok((await p.$$eval('#tlCard [name=proj] option', (o) => o.map((x) => x.textContent))).includes('Clipper'), 'project picker lists Clipper');
  ok((await p.$$eval('#tlCard [name=cat] option', (o) => o.map((x) => x.textContent))).includes('Trading'), 'type picker lists the event types');

  // Time Audit with the seeded week (before any live timers, so the numbers are exact)
  await p.click('#tlCard [data-tlaudit]'); await wait(250);
  ok(await p.isVisible('#tlDlg'), 'Time audit opens');
  const sent = await p.textContent('#tlSent');
  ok(/You planned 6 h of Clipper and logged 2\.5 h\./.test(sent), 'plain sentence: ' + sent);
  ok(/Trading ran 1\.5 h over plan/.test(sent), 'overrun sentence: ' + sent);
  ok(/You logged 3 h of Personal that was not on your calendar/.test(sent), 'unplanned sentence: ' + sent);
  const sinks = await p.$$eval('#tlSinks .tl-sink', (n) => n.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(sinks.length === 3 && /Trading/.test(sinks[0]) && /Personal/.test(sinks[1]) && /Clipper/.test(sinks[2]), 'top 3 sinks in order: ' + sinks.join(' | '));
  ok(/3\.5 h/.test(sinks[0]), 'sink hours: ' + sinks[0]);
  const tiles = await p.textContent('#tlTiles'); ok(/9 h\s*logged/.test(tiles) && /8 h\s*planned/.test(tiles) && /3 h\s*not planned/.test(tiles), 'tiles: ' + tiles);
  const crow = await p.textContent('#tlRows [data-tlb="p:clipper"]'); ok(/2\.5 h logged/.test(crow) && /6 h planned/.test(crow) && /3\.5 h under plan/.test(crow), 'Clipper row: ' + crow);
  const trow = await p.textContent('#tlRows [data-tlb="c:trading"]'); ok(/3\.5 h logged/.test(trow) && /2 h planned/.test(trow) && /over plan/.test(trow), 'Trading row: ' + trow);
  ok((await p.$$('#tlEnts [data-tlent]')).length === 4, 'four entries listed');
  // previous week is empty
  await p.click('[data-tlnav="-1"]'); await wait(100); ok(/Nothing logged yet/.test(await p.textContent('#tlSent')), 'other weeks are separate');
  await p.click('[data-tlnav="0"]'); await wait(100);
  // edit an entry from the audit, then delete it with undo available
  await p.click('[data-tlent="l4"]'); await wait(150);
  ok(await p.inputValue('#tlfWhat') === 'YouTube', 'entry opens for editing');
  await p.fill('#tlfWhat', 'YouTube rabbit hole'); await p.click('[data-tlsave]'); await wait(200);
  ok((await state()).timelog.find((e) => e.id === 'l4').title === 'YouTube rabbit hole', 'edit saved'); ok(await p.isVisible('#tlSent'), 'back on the audit after saving');
  await p.click('[data-tlent="l4"]'); await wait(150); await p.click('[data-tldel]'); await wait(200); await p.click('#askYes'); await wait(250);
  const s1 = await state(); ok(!s1.timelog.some((e) => e.id === 'l4') && s1.deleted && s1.deleted.l4, 'deleted entry leaves a sync tombstone (collection is synced)');
  await p.click('#tlDlg [data-close]'); await wait(150);
  await p.click('#toastBtn'); await wait(200); ok((await state()).timelog.some((e) => e.id === 'l4'), 'undo brings it back');

  // start the timer from Today
  await p.fill('#tlCard [name=what]', 'Plan the Clipper intro'); await p.selectOption('#tlCard [name=proj]', 'clipper'); await p.selectOption('#tlCard [name=cat]', 'content');
  await p.click('#tlCard button[type=submit]'); await wait(300);
  let st = await state(); const run = st.timelog.find((e) => !e.end);
  ok(run && run.title === 'Plan the Clipper intro' && run.proj === 'clipper' && run.cat === 'content' && Math.abs(Date.now() - run.start) < 15000, 'timer started with title, project and type: ' + JSON.stringify(run));
  ok(await p.isVisible('#tlCard [data-tlstop]'), 'Stop button shows'); const t0 = await p.textContent('#tlCard .tl-el'); await wait(2200);
  ok((await p.textContent('#tlCard .tl-el')) !== t0, 'the clock ticks: ' + t0 + ' -> ' + await p.textContent('#tlCard .tl-el'));
  // survives a reload (start time is saved)
  await p.reload(); await wait(1300);
  ok(await p.isVisible('#tlCard [data-tlstop]') && /Plan the Clipper intro/.test(await p.textContent('#tlCard')), 'running timer survives a reload');
  ok((await state()).timelog.find((e) => !e.end).start === run.start, 'same start time after the reload');
  await p.click('#tlCard [data-tlstop]'); await wait(300);
  st = await state(); const done = st.timelog.find((e) => e.id === run.id);
  ok(done.end > done.start && !st.timelog.some((e) => !e.end), 'Stop writes the end time and nothing keeps running');
  ok(/Logged/.test(await p.textContent('#toastMsg')), 'toast says what was logged');
  // starting something while another runs stops the first
  await p.click('#tlCard [data-tlchip]'); await wait(300);
  await p.fill('#tlDlg [name=what]', 'x').catch(() => null);
  st = await state(); ok(st.timelog.filter((e) => !e.end).length === 1, 'chip starts exactly one timer');
  const chipRun = st.timelog.find((e) => !e.end); ok(chipRun.title === 'Clipper edit' || chipRun.title === 'Plan the Clipper intro' || chipRun.title === 'Trading session' || chipRun.title === 'YouTube rabbit hole' || chipRun.title === 'YouTube', 'chip title copied: ' + chipRun.title);
  // switching: start a second one by typing; the first must be closed
  await p.evaluate(() => document.querySelector('#tlCard [data-tlstop]').click()); await wait(200);
  await p.fill('#tlCard [name=what]', 'First thing'); await p.click('#tlCard button[type=submit]'); await wait(250);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); const r = s.timelog.find((e) => !e.end); r.start -= 30 * 60000; localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(1200);
  await p.click('#tlCard [data-tlstop]'); await wait(250);
  const first = (await state()).timelog.find((e) => e.title === 'First thing');
  ok(first.end - first.start >= 30 * 60000 && first.end - first.start < 31 * 60000, 'stopped timer length is real: ' + (first.end - first.start) / 60000 + ' min');
  // empty title is refused
  await p.click('#tlCard button[type=submit]'); await wait(150); ok(!(await state()).timelog.some((e) => !e.end), 'empty title does not start a timer');

  // log time I forgot
  await p.click('#tlCard [data-tllog]'); await wait(250);
  ok(await p.isVisible('#tlDlg') && /Log time I forgot/.test(await p.textContent('#tlTitle')), 'manual log opens');
  await p.click('[data-tlsave]'); await wait(100); ok(/Say what you worked on/.test(await p.textContent('#tlfErr')), 'needs a title');
  await p.fill('#tlfWhat', 'Forgotten client call'); await p.click('[data-tlpre="60"]');
  await p.selectOption('#tlfProj', 'nq');
  await p.click('[data-tlsave]'); await wait(300);
  const fg = (await state()).timelog.find((e) => e.title === 'Forgotten client call');
  ok(fg && Math.abs((fg.end - fg.start) - 3600e3) < 120e3 && fg.proj === 'nq', 'logged a past hour: ' + JSON.stringify(fg));
  ok(!(await p.isVisible('#tlDlg')), 'sheet closes after logging from Today');
  await p.click('#tlCard [data-tllog]'); await wait(200);
  await p.fill('#tlfWhat', 'Backwards'); await p.fill('#tlfT2', '08:00'); await p.fill('#tlfT1', '09:00'); await p.fill('#tlfD2', await p.inputValue('#tlfD1'));
  await p.click('[data-tlsave]'); await wait(100); ok(/end must be after the start/i.test(await p.textContent('#tlfErr')), 'end before start is refused');
  const fut = await p.evaluate(() => { const d = new Date(Date.now() + 86400e3); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  await p.fill('#tlfD1', fut); await p.fill('#tlfD2', fut); await p.fill('#tlfT1', '09:00'); await p.fill('#tlfT2', '10:00'); await p.click('[data-tlsave]'); await wait(100);
  ok(/future/.test(await p.textContent('#tlfErr')), 'time in the future is refused');
  await p.click('[data-tlcancel]'); await wait(100);

  // runaway timer: started 9 hours ago -> warned, never counted past 8 h
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); s.timelog = s.timelog.filter((e) => e.end); s.timelog.push({ id: 'run9', title: 'Forgot to stop', cat: 'content', proj: '', start: Date.now() - 9 * 3600e3, end: 0, u: Date.now() }); localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(2200);
  ok(await p.isVisible('#tlWarn') && /9 h/.test(await p.textContent('#tlWarn')), 'warning on the Today card after 8 hours: ' + (await p.textContent('#tlCard')).slice(0, 160));
  ok(await p.isVisible('#askDlg') && /Timer still running/.test(await p.textContent('#askTitle')), 'a dialog asks about the forgotten timer on open');
  await p.click('#askNo'); await wait(150);
  ok(!(await p.isVisible('#tlCard [data-tlstop]')), 'no plain Stop for a runaway: use Stop at 8 h or set the end');
  await p.click('#tlCard [data-tlaudit]'); await wait(200);
  const ent = await p.textContent('[data-tlent="run9"]'); ok(/running/.test(ent), 'audit marks the running entry');
  await p.click('#tlDlg [data-close]'); await wait(100);
  const cap = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); return s.timelog.find((e) => e.id === 'run9').end; });
  ok(cap === 0, 'still running until the user decides');
  await p.click('#tlCard [data-tlcap]'); await wait(250);
  const r9 = (await state()).timelog.find((e) => e.id === 'run9'); ok(r9.end === r9.start + 8 * 3600e3, 'Stop at 8 h sets end = start + 8 h');
  await p.click('#toastBtn'); await wait(200); ok((await state()).timelog.find((e) => e.id === 'run9').end === 0, 'undo puts the timer back');
  await p.click('#tlCard [data-tledit]'); await wait(250);
  ok(await p.isVisible('#tlDlg') && /still running/.test(await p.textContent('#tlBody')), 'Set the end time opens the editor');
  await p.click('[data-tlsave]'); await wait(300);
  const r10 = (await state()).timelog.find((e) => e.id === 'run9'); ok(r10.end > r10.start, 'saving the edit stops the timer');

  // Now bar (phone, not on Today): start and stop from the chip
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); s.view = 'month'; localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(1200);
  ok(await p.isVisible('#nowbar [data-tlnow]'), 'timer button in the Now bar');
  await p.tap('#nowbar [data-tlnow]'); await wait(300); ok(await p.isVisible('#tlDlg') && /Start the timer/.test(await p.textContent('#tlTitle')), 'idle chip opens the start sheet');
  await p.fill('#tlDlg [name=what]', 'From the Now bar'); await p.click('#tlDlg button[type=submit]'); await wait(400);
  ok(!(await p.isVisible('#tlDlg')), 'sheet closes on start'); ok(/■/.test(await p.textContent('#nowbar [data-tlnow]')), 'chip shows the running clock: ' + await p.textContent('#nowbar [data-tlnow]'));
  ok((await state()).timelog.some((e) => !e.end && e.title === 'From the Now bar'), 'timer running');
  await p.tap('#nowbar [data-tlnow]'); await wait(300); ok(!(await state()).timelog.some((e) => !e.end), 'tapping the running chip stops it');

  // deep links
  await p.goto(URL + '#time-audit'); await wait(900); ok(await p.isVisible('#tlDlg') && /Time audit/.test(await p.textContent('#tlTitle')), '#time-audit deep link'); await p.keyboard.press('Escape');
  await p.goto(URL + '#timer'); await wait(900); ok(await p.isVisible('#tlDlg') && /Start the timer/.test(await p.textContent('#tlTitle')), '#timer deep link'); await p.keyboard.press('Escape');

  // palette hooks
  await p.keyboard.press('Control+k'); await wait(100); await p.fill('#pkIn', 'time audit'); await p.keyboard.press('Enter'); await wait(250);
  ok(await p.isVisible('#tlDlg') && /Time audit/.test(await p.textContent('#tlTitle')), 'palette opens the Time audit');
  await p.click('#tlDlg [data-close]');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at 390px');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); s.view = 'today'; localStorage.setItem('planner.v1', JSON.stringify(s)); }); await p.reload(); await wait(1000);
  await p.screenshot({ path: '/tmp/timelog-today.png', fullPage: false });
  await p.click('#tlCard [data-tlaudit]'); await wait(250); await p.screenshot({ path: '/tmp/timelog-audit.png' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll with the audit open');
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('TIMELOG OK');
})();
