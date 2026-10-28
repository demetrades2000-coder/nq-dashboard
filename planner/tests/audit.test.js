const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  // 1. corrupt localStorage
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { localStorage.setItem('planner.v1', '{not json'); localStorage.setItem('planner.nq', '[[['); localStorage.setItem('planner.sync', 'x'); });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('corrupt: ' + e.message));
    await p.goto(URL); await wait(3000);
    ok(await p.locator('.mc').count() >= 28, 'renders with corrupt storage'); await ctx.close(); }
  // 2. storage that throws on every access
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { const bad = { get() { throw new Error('blocked'); } }; Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); });
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('blocked storage: ' + e.message));
    await p.goto(URL); await wait(2500);
    ok(await p.locator('.mc').count() >= 28, 'renders with blocked storage');
    await p.click('#newBtn'); await p.fill('#fTitle', 'x'); await p.click('#fSave'); await wait(300);
    ok(await p.locator('.chip:has-text("x")').count() >= 1, 'can still add event in memory'); await ctx.close(); }
  // 3. XSS via titles / notes / project names / task titles / money notes
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('xss: ' + e.message));
    await p.addInitScript(() => { window.__x = 0; });
    p.on('dialog', (d) => { errs.push('dialog fired ' + d.message()); d.dismiss(); });
    await p.goto(URL); await wait(2500);
    const evil = '"><img src=x onerror="window.__x=1"><svg onload="window.__x=2">';
    await p.evaluate((evil) => { const d = new Date(), pad = (n) => String(n).padStart(2, '0'), k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const s = JSON.parse(localStorage.getItem('planner.v1') || '{}'); const id = 'a"b\'c';
      s.events = [{ id, title: evil, cat: 'trading', date: k, allDay: false, start: '09:00', end: '10:00', repeat: 'none', ex: [], notes: evil, proj: 'kalshi' }];
      s.tasks = [{ id: 't"1', title: evil, date: k, done: false, created: 1, notes: evil, sub: [{ id: 's', t: evil, d: false }] }];
      s.projects = [{ id: 'kalshi', name: evil, color: 'red;background:url(javascript:1)', status: 'active', milestone: evil, due: k, link: 'javascript:alert(1)', notes: evil }];
      s.money = [{ id: 'm', kind: 'in', amt: 5, date: k, note: evil }]; s.goals = [{ id: 'g', title: evil, target: 5, cur: 1, kind: 'manual', unit: '$' }]; s.habits = [{ id: 'h', name: evil, color: '#000', days: [0, 1, 2, 3, 4, 5, 6] }];
      localStorage.setItem('planner.v1', JSON.stringify(s)); }, evil);
    await p.reload(); await wait(1500);
    for (const v of ['month', 'week', 'day', 'agenda', 'projects']) { await p.click(`#views [data-v=${v}]`); await wait(250); }
    await p.click('#views [data-v=habits]'); await wait(250); await p.click('#views [data-v=review]'); await wait(250);
    await p.fill('#q', 'img'); await wait(300);
    ok(await p.evaluate(() => window.__x) === 0, 'XSS executed: ' + await p.evaluate(() => window.__x));
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /^javascript:/i.test(h)));
    ok(links.length === 0, 'javascript: link rendered ' + links); await ctx.close(); }
  // 4. old-format backup restores without losing defaults / crashing
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('restore: ' + e.message));
    await p.goto(URL); await wait(2500);
    const old = JSON.stringify({ v: 1, categories: [{ id: 'x', name: 'X', color: '#111111' }], events: [{ id: 'e1', title: 'Old event', cat: 'x', date: '2026-10-30', allDay: true }], tasks: [{ id: 't1', title: 'Old task', date: '', done: false, created: 1 }] });
    await p.setInputFiles('#importFile', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(old) }); await wait(300);
    await p.click('#askYes'); await wait(400);
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
    ok(st.events.length === 1 && st.tasks.length === 1 && Array.isArray(st.habits) && Array.isArray(st.goals) && st.projects.length >= 0, 'old backup restored: ' + Object.keys(st).join(','));
    await p.click('#views [data-v=projects]'); await wait(300); ok(await p.locator('.gm').count() === 1, 'projects renders after restore');
    await p.setInputFiles('#importFile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('nope') }); await wait(300); ok(/not a Planner backup/.test(await p.textContent('#toastMsg')), 'bad file rejected'); await ctx.close(); }
  // 5. time conversion around DST (US falls back Nov 1 2026; UK fell back Oct 25 2026)
  { const ctx = await b.newContext({ timezoneId: 'Europe/London' }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('dst: ' + e.message));
    await p.goto(URL); await wait(5500);
    const doc = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.nq')).doc);
    const g = (id) => doc.events.find((e) => e.id === id);
    // evaluate conversions through the app's own agenda by reading start times of a before/after DST release
    await p.evaluate(() => { document.querySelector('#mini [data-date="2026-10-29"]').click(); });
    await p.click('#views [data-v=week]'); await wait(300);
    const t1 = await p.locator('.tg-col[data-date="2026-10-29"] .blk', { hasText: 'Core PCE' }).textContent();
    ok(/12:30pm/.test(t1), 'ET 08:30 -> London 12:30 before US DST end: ' + t1);
    await p.click('#nextBtn'); await wait(300);
    const t2 = await p.locator('.tg-col[data-date="2026-11-06"] .blk', { hasText: 'Non-Farm' }).count() ? await p.locator('.tg-col[data-date="2026-11-06"] .blk', { hasText: 'Non-Farm' }).textContent() : '';
    ok(/1:30pm/.test(t2), 'ET 08:30 -> London 13:30 after US DST end: ' + t2); await ctx.close(); }
  // 6. recurring event across the US DST change keeps wall time; week starting Monday; 6-week month
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/New_York' }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('rec: ' + e.message));
    await p.goto(URL); await wait(2500);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1') || '{}'); s.weekStart = 1; s.events = [{ id: 'r', title: 'Daily 9', cat: 'trading', date: '2026-10-26', allDay: false, start: '09:00', end: '09:30', repeat: 'weekdays', ex: [] }, { id: 'm', title: 'Monthly 31', cat: 'trading', date: '2026-01-31', allDay: true, repeat: 'monthly', ex: [] }]; localStorage.setItem('planner.v1', JSON.stringify(s)); });
    await p.reload(); await wait(1200);
    await p.click('#views [data-v=week]'); await p.evaluate(() => document.querySelector('#mini [data-date="2026-11-02"]')?.click()); await wait(300);
    ok(await p.locator('.tg-col .blk', { hasText: 'Daily 9' }).count() === 5, 'weekday repeat 5/week after DST: ' + await p.locator('.tg-col .blk', { hasText: 'Daily 9' }).count());
    ok(/9am/.test(await p.locator('.tg-col .blk', { hasText: 'Daily 9' }).first().textContent()), 'wall time kept across DST');
    const first = await p.locator('.tg-head .tg-day span').first().textContent(); ok(/MON/i.test(first), 'week starts Monday: ' + first);
    await ctx.close(); }
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'AUDIT OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 5).join('\n')); console.log(errs.join('\n')); process.exit(1); });
