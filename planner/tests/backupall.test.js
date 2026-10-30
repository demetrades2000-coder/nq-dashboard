// Backup and restore cover every synced collection: node planner/tests/backupall.test.js  (serve the site first, see shifts.test.js; PORT=... overrides, default 8777)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1. static: the collection lists in the page source agree, and every sync path walks them
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const x = src.match(/const XSYNC = \[([^\]]*)\]/), sy = src.match(/const SYNCED = \[([^\]]*)\]/);
  ok(x && sy, 'XSYNC and SYNCED found in the page');
  const names = (s) => (s.match(/'[a-z0-9]+'/g) || []).map((v) => v.slice(1, -1));
  const XS = names(x[1]), BASE = names(sy[1]);
  ok(/\.\.\.XSYNC/.test(sy[1]), 'SYNCED includes every XSYNC collection');
  ok(XS.length >= 25, 'XSYNC lists the feature collections: ' + XS.length);
  const body = (re) => { const m = src.match(re); return m ? m[0] : ''; };
  ok(/\.\.\.Object\.fromEntries\(XSYNC\.map\(\(k\) => \[k, S\[k\]\]\)\)/.test(body(/const userDoc = [^\n]*/)), 'userDoc writes every XSYNC collection');
  ok(/XSYNC\.map\(\(k\) => \[k, ml\(a\[k\], b\[k\]\)\]\)/.test(body(/function mergeDocs[\s\S]*?\n\}\n/)), 'mergeDocs merges every XSYNC collection');
  ok(/\.\.\.XSYNC\]\.forEach\(\(k\) => \{ if \(Array\.isArray\(d\[k\]\)\) S\[k\] = d\[k\]/.test(body(/function applyDoc[\s\S]*?\n\}\n/)), 'applyDoc reads every XSYNC collection');
  ok(/Array\.isArray\(s\[k\]\) \? s\[k\]\.filter/.test(body(/function normalize[\s\S]*?\n\}\nfunction load/)), 'normalize keeps every XSYNC collection');
  const ALL = [...new Set([...BASE, ...XS])];

  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.goto(URL); await wait(1800);
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));

  // 2. seed one item into every synced collection (categories keeps its defaults plus a custom one)
  await p.evaluate((ALL) => {
    const s = JSON.parse(localStorage.getItem('planner.v1')) || {};
    ALL.forEach((k) => { const item = { id: 'bk-' + k, title: 'Backup ' + k, name: 'Backup ' + k, u: 1, created: 1, date: '2026-10-05', kind: 'in', amt: 5 }; s[k] = k === 'categories' ? (s.categories || []).concat([{ id: 'bk-categories', name: 'Backup cat', color: '#123456' }]) : [item]; });
    localStorage.setItem('planner.v1', JSON.stringify(s));
  }, ALL);
  await p.reload(); await wait(1500);
  const seeded = await st();
  ALL.forEach((k) => ok(Array.isArray(seeded[k]) && seeded[k].some((i) => i.id === 'bk-' + k), 'seed survived a reload: ' + k));

  // 3. Back up through the real button and read the file
  await p.click('#moreBtn').catch(() => {});
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.evaluate(() => document.querySelector('#exportBtn').click())]);
  const file = await dl.path(); const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  ALL.forEach((k) => ok(Array.isArray(backup[k]) && backup[k].some((i) => i.id === 'bk-' + k), 'backup file contains: ' + k));

  // 4. wipe everything, restore, and every collection is back
  await p.evaluate((ALL) => { const s = JSON.parse(localStorage.getItem('planner.v1')); ALL.forEach((k) => { if (k !== 'categories') s[k] = []; }); localStorage.setItem('planner.v1', JSON.stringify(s)); }, ALL);
  await p.reload(); await wait(1500);
  const restore = async (obj) => { await p.setInputFiles('#importFile', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj)) }); await wait(300); await p.click('#askYes'); await wait(600); };
  await restore(backup);
  const back = await st();
  ALL.forEach((k) => ok(Array.isArray(back[k]) && back[k].some((i) => i.id === 'bk-' + k), 'restored: ' + k));
  ok(back.weekStart === (backup.weekStart === 1 ? 1 : 0), 'week start restored');

  // 5. an old backup that has none of the newer collections restores without errors and leaves them alone
  const old = { events: [{ id: 'oe', title: 'Old event', cat: 'personal', date: '2026-10-01', allDay: true, repeat: 'none', ex: [] }], tasks: [{ id: 'ot', title: 'Old task', date: '', done: false, created: 1 }] };
  const nErr = errs.length;
  await restore(old);
  const after = await st();
  ok(errs.length === nErr, 'old backup restored without page errors: ' + errs.slice(nErr).join('|'));
  ok(after.events.length === 1 && after.events[0].id === 'oe' && after.tasks.length === 1 && after.tasks[0].id === 'ot', 'old backup replaced events and tasks');
  ['jobs', 'bills', 'deals', 'timelog', 'miles', 'worth', 'propacct', 'taxpay', 'avreq', 'money', 'habits', 'journal', 'goals', 'projects', 'templates', 'health'].forEach((k) => ok(after[k].some((i) => i.id === 'bk-' + k), 'collection missing from the old backup was kept, not wiped: ' + k));
  ok(after.categories.some((c) => c.id === 'bk-categories'), 'custom event types kept when the old backup has none');
  await p.reload(); await wait(1200);
  ok(await p.locator('.tdy, .mc').count() > 0, 'app renders after the old-backup restore');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'BACKUP-ALL OK (' + ALL.length + ' collections)');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
