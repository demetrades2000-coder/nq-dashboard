// Command palette and universal search: node planner/tests/palette.test.js  (serve the site first, see shifts.test.js; PORT=... overrides, default 8782)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8782) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.goto(URL); await wait(1200);
  const today = await p.evaluate(() => {
    const pad = (n) => String(n).padStart(2, '0'), key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const add = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return key(d); };
    const s = JSON.parse(localStorage.getItem('planner.v1')) || {};
    s.events = [{ id: 'e1', title: 'Dentist appointment', cat: 'personal', date: add(2), allDay: false, start: '10:00', end: '11:00', endDate: '', repeat: 'none', until: '', notes: 'bring insurance card', proj: '', ex: [], created: 1 }];
    s.tasks = [{ id: 't1', title: 'Buy gloves for the shop', date: add(1), done: false, p: 0, proj: '', created: 1 }];
    s.goals = [{ id: 'g1', title: 'First sponsor payout', kind: 'manual', target: 1000, cur: 250, unit: '$', due: '', created: 1 }];
    s.money = [{ id: 'm1', kind: 'in', amt: 300, date: add(-1), note: 'Sponsor payout Acme', proj: '', created: 1 }];
    s.journal = [{ id: 'j:' + add(-1), date: add(-1), note: 'Followed the plan but hesitated on the second entry.', mood: 4, rules: 'yes' }];
    s.tradenotes = [{ id: 'tn:zz', tk: 'zz', day: add(-2), acct: 'x', text: 'chased the breakout again', tags: ['FOMO'], rating: 2 }];
    s.habits = [{ id: 'h1', name: 'Stretch routine', color: '#2563eb', days: [0, 1, 2, 3, 4, 5, 6], log: {} }];
    s.view = 'month'; s.weekStart = 0;
    localStorage.setItem('planner.v1', JSON.stringify(s));
    localStorage.removeItem('planner.pk.recent');
    return { t: add(0), d1: add(1), d2: add(2) };
  });
  await p.reload(); await wait(1200);
  const openPk = async () => { await p.keyboard.press('Control+k'); await wait(150); };
  const type = async (q) => { await p.fill('#pkIn', q); await wait(120); };
  const groups = async () => p.$$eval('#pkList .pk-g', (n) => n.map((x) => x.textContent));
  const rows = async () => p.$$eval('#pkList .pk-r b', (n) => n.map((x) => x.textContent));
  const closeAll = async () => { for (let i = 0; i < 3; i++) { if (await p.evaluate(() => !!document.querySelector('dialog[open]'))) { await p.keyboard.press('Escape'); await wait(80); } } };

  // opens with Ctrl+K, toggles with it, closes with Esc
  await openPk(); ok(await p.isVisible('#pkDlg'), 'Ctrl+K opens the palette');
  ok(await p.evaluate(() => document.activeElement.id === 'pkIn'), 'the box has focus');
  await p.keyboard.press('Control+k'); await wait(100); ok(!(await p.isVisible('#pkDlg')), 'Ctrl+K again closes it');
  await openPk(); await p.keyboard.press('Escape'); await wait(100); ok(!(await p.isVisible('#pkDlg')), 'Esc closes it');
  await openPk(); ok(/Actions/.test((await groups()).join()) && (await rows()).includes('New event'), 'empty box lists actions: ' + (await rows()).join(','));

  // events: grouped, tap-through opens the editor with the event
  await type('dent'); ok((await groups()).includes('Events'), 'Events group for "dent": ' + (await groups()).join());
  await p.keyboard.press('Enter'); await wait(250);
  ok(await p.isVisible('#evDlg') && (await p.inputValue('#fTitle')) === 'Dentist appointment', 'Enter opens the event editor');
  await closeAll();
  // notes are searched too
  await openPk(); await type('insurance'); ok((await rows()).includes('Dentist appointment'), 'finds an event by its notes');
  await p.keyboard.press('Escape');
  // tasks
  await openPk(); await type('gloves'); ok((await groups()).includes('Tasks'), 'Tasks group'); await p.click('#pkList .pk-r'); await wait(250);
  ok(await p.isVisible('#taskDlg') && (await p.inputValue('#tTitle')) === 'Buy gloves for the shop', 'tap on a task opens its sheet');
  await closeAll();
  // projects
  await openPk(); await type('clipper'); ok((await groups()).includes('Projects'), 'Projects group'); await p.click('#pkList .pk-r'); await wait(250);
  ok(await p.isVisible('#projDlg'), 'tap on a project opens it'); await closeAll();
  // goals + money both match "payout"
  await openPk(); await type('payout'); const g = await groups();
  ok(g.includes('Goals') && g.includes('Money'), 'goals and money in one search: ' + g.join());
  await p.click('#pkList .pk-r >> nth=0'); await wait(250);
  ok(await p.isVisible('#goalDlg') || await p.isVisible('#moneyDlg'), 'goal or money sheet opens'); await closeAll();
  await openPk(); await type('payout'); await p.click('#pkList .pk-r:has(.pk-k:text("Money"))'); await wait(250);
  ok(await p.isVisible('#moneyDlg') && (await p.inputValue('#mNote')) === 'Sponsor payout Acme', 'money entry opens'); await closeAll();
  // journal + trade notes + jobs + habits
  await openPk(); await type('hesitated'); ok((await groups()).includes('Journal'), 'Journal group'); await p.click('#pkList .pk-r'); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).view)) === 'day' && /hesitated/.test(await p.evaluate(() => document.querySelector('#jrnDay textarea') ? document.querySelector('#jrnDay textarea').value : '')), 'journal result opens that day with the note');
  await openPk(); await type('breakout'); ok((await groups()).includes('Trade notes'), 'Trade notes group'); await p.keyboard.press('Escape');
  await openPk(); await type('outback'); ok((await groups()).includes('Jobs'), 'Jobs group'); await p.click('#pkList .pk-r:has(.pk-k:text("Job"))'); await wait(250);
  ok(await p.isVisible('#shDlg') && /Outback/.test(await p.inputValue('#shName')), 'job opens in Shifts'); await closeAll();
  await openPk(); await type('stretch'); ok((await groups()).includes('Habits'), 'Habits group'); await p.click('#pkList .pk-r'); await wait(250);
  ok(await p.isVisible('#habDlg'), 'habit opens'); await closeAll();
  await openPk(); await type('zzqqxx'); ok(/Nothing found/.test(await p.textContent('#pkList')), 'friendly empty result'); await p.keyboard.press('Escape');

  // commands, with fuzzy matching
  const cmd = async (q, sel, label) => { await openPk(); await type(q); await p.keyboard.press('Enter'); await wait(300); ok(await p.isVisible(sel), `"${q}" -> ${label}`); await closeAll(); };
  await cmd('new event', '#evDlg', 'new event editor');
  await cmd('shifts', '#shDlg', 'Shifts');
  await cmd('plan day', '#planDlg', 'Plan day');
  await cmd('earnings', '#erDlg', 'Earnings');
  await cmd('week balance', '#wbDlg', 'Week balance');
  await cmd('check my week', '#gdDlg', 'Check my week');
  await cmd('chk wk', '#gdDlg', 'fuzzy "chk wk" finds Check my week');
  await cmd('earn', '#erDlg', 'prefix "earn"');
  await openPk(); await type('new task'); await p.keyboard.press('Enter'); await wait(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).view) === 'today' && await p.evaluate(() => document.activeElement && document.activeElement.closest('[data-tadd]') != null), 'new task focuses the quick-add box on Today');
  // typed shortcut makes a task straight away
  await openPk(); await type('new task call Sam fri'); await p.keyboard.press('Enter'); await wait(300);
  const tk = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).tasks.find((t) => /call Sam/.test(t.title)));
  ok(tk && tk.title === 'call Sam' && /^\d{4}-\d\d-\d\d$/.test(tk.date), 'typed "new task call Sam fri" adds the task with a date: ' + JSON.stringify(tk));

  // dates
  const dayTitle = () => p.textContent('#title');
  const monthName = (k) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+k.slice(5, 7) - 1];
  const expect = await p.evaluate(() => {
    const pad = (n) => String(n).padStart(2, '0'), key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const add = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return key(d); };
    const nextFri = (() => { const d = new Date(); let n = (5 - d.getDay() + 7) % 7; if (n === 0) n = 7; return add(n); })();
    const d = new Date(); const dec = new Date(d.getFullYear(), 11, 25); const dk = key(dec) < add(-90) ? key(new Date(d.getFullYear() + 1, 11, 25)) : key(dec);
    return { tomorrow: add(1), nextFri, dec: dk };
  });
  const dayWord = (k) => `${monthName(k)} ${+k.slice(8)}`;
  await openPk(); await type('tomorrow'); ok((await groups()).includes('Go to date'), 'date group for "tomorrow"'); await p.keyboard.press('Enter'); await wait(300);
  ok((await dayTitle()).includes(dayWord(expect.tomorrow)), `"tomorrow" jumps to ${expect.tomorrow}: ` + await dayTitle());
  await openPk(); await type('next friday'); await p.keyboard.press('Enter'); await wait(300);
  ok((await dayTitle()).includes(dayWord(expect.nextFri)), `"next friday" jumps to ${expect.nextFri}: ` + await dayTitle());
  await openPk(); await type('12/25'); await p.keyboard.press('Enter'); await wait(300);
  ok((await dayTitle()).includes(`December 25, ${expect.dec.slice(0, 4)}`), '"12/25" jumps to Dec 25: ' + await dayTitle());
  await openPk(); await type('today'); await p.keyboard.press('Enter'); await wait(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).view) === 'today', '"today" goes to Today');

  // arrow keys + Enter
  await openPk(); await type('new');
  const r0 = await rows(); await p.keyboard.press('ArrowDown'); await wait(60);
  ok(await p.evaluate(() => document.querySelectorAll('#pkList .pk-r')[1].getAttribute('aria-selected') === 'true'), 'ArrowDown moves the highlight');
  await p.keyboard.press('ArrowUp'); await wait(60);
  ok(await p.evaluate(() => document.querySelectorAll('#pkList .pk-r')[0].getAttribute('aria-selected') === 'true'), 'ArrowUp moves it back');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await wait(300);
  ok(r0.length > 1, 'several results for "new": ' + r0.join(',')); await closeAll();

  // last 5 choices are remembered
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.pk.recent')));
  ok(rec.length === 5, 'only the last 5 choices are kept: ' + rec.length);
  await openPk(); ok((await groups())[0] === 'Recent', 'Recent group comes first'); ok((await p.$$('#pkList .pk-r')).length >= 5, 'recent rows shown');
  const recentRows = await rows(); ok(recentRows.slice(0, 5).length === 5, 'recent list has 5: ' + recentRows.slice(0, 5).join(' | '));
  await closeAll();

  // deep link
  await p.goto(URL + '#search'); await wait(900); ok(await p.isVisible('#pkDlg'), '#search deep link opens the palette'); await p.keyboard.press('Escape');

  // phone: header button, no sideways scroll
  const pc = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const m = await pc.newPage(); m.on('pageerror', (e) => errs.push('phone: ' + e.message));
  await m.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await m.goto(URL); await wait(1200);
  ok(await m.isVisible('#pkBtn'), 'search button is in the header on a phone');
  await m.tap('#pkBtn'); await wait(250); ok(await m.isVisible('#pkDlg'), 'tap opens the palette');
  await m.fill('#pkIn', 'shifts'); await wait(150);
  ok((await m.evaluate(() => getComputedStyle(document.querySelector('#pkIn')).fontSize)) === '16px', 'box is 16px so iOS does not zoom');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll (palette open)');
  await m.tap('#pkList .pk-r'); await wait(300); ok(await m.isVisible('#shDlg'), 'tapping a result opens it');
  await m.screenshot({ path: '/tmp/palette-phone.png' });
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('PALETTE OK');
})();
