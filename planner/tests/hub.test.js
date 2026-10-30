// All tools hub: node planner/tests/hub.test.js  (serve the site first, see shifts.test.js; PORT=... overrides, default 8788)
// Every tile opens its tool with zero page errors, the filter works, recents and pinned tools persist, 390px has no sideways scroll.
const { chromium } = require('playwright');
const { URL, wait, open, st } = require('./lib-money.js');
const NOW = Date.parse('2026-10-14T12:00:00-04:00'); // a Wednesday
// tool id -> what must be visible after tapping its tile (a sheet id, or a function run in the page)
const EXPECT = {
  setup: '#suDlg', earnings: '#erDlg', bills: '#bnDlg', cashflow: '#bnDlg', payday: '#pdDlg', taxes: '#tqDlg', worth: '#wtDlg', business: '#bzDlg', prop: '#ppDlg', miles: '#miDlg',
  shifts: '#shDlg', hours: '#hrDlg', availability: '#avDlg', deals: '#plDlg', timelog: '#tlDlg', tradeplan: '#tpCard', tilt: '#tsDlg', trades: 'view:trades', edge: '#edDlg', rules: 'view:rules',
  journal: 'view:day', score: '#scDlg', habits: 'view:habits', health: 'view:health', weekbalance: '#wbDlg', review: 'view:review', brief: '#brDlg', checkweek: '#gdDlg', alerts: '#alDlg', backup: 'download',
};
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const { ctx, p, errs: pe } = await open(b, { now: NOW, hash: '#tools' });
  ok(await p.isVisible('#hbDlg'), '#tools opens the hub');
  const ids = await p.$$eval('#hbBody [data-hbtool]', (n) => n.map((x) => x.dataset.hbtool));
  ok(Object.keys(EXPECT).every((k) => ids.includes(k)), 'every tool has a tile, missing: ' + Object.keys(EXPECT).filter((k) => !ids.includes(k)));
  const groups = await p.$$eval('#hbBody .hub-sec', (n) => n.map((x) => x.textContent));
  ok(['Money', 'Work', 'Trading', 'Me', 'Calendar'].every((g) => groups.includes(g)), 'groups: ' + groups);
  ok(groups[0] === 'Start here', 'Setup is first: ' + groups);
  ok(!(await p.$('#hbBody .hub-sec:text("Recent")')), 'no Recent before anything was opened');
  { const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'hub: no sideways scroll ' + w);
    const w2 = await p.evaluate(() => { const d = document.querySelector('#hbDlg .dlg'); return d.scrollWidth - d.clientWidth; }); ok(w2 <= 1, 'hub sheet: no sideways scroll ' + w2); }
  // filter
  await p.fill('#hbQ', 'bill'); await wait(100);
  let shown = await p.$$eval('#hbBody [data-hbtool]', (n) => n.map((x) => x.dataset.hbtool));
  ok(shown.includes('bills') && !shown.includes('tilt') && !shown.includes('habits'), 'filter "bill": ' + shown);
  await p.fill('#hbQ', 'zzzz'); await wait(100);
  ok(/No tool matches/.test(await p.textContent('#hbBody')), 'filter with no match says so');
  await p.fill('#hbQ', 'stop trading'); await wait(100);
  shown = await p.$$eval('#hbBody [data-hbtool]', (n) => n.map((x) => x.dataset.hbtool)); ok(shown.includes('tilt'), 'filter finds tilt by its description: ' + shown);
  await p.fill('#hbQ', ''); await p.keyboard.press('Escape'); await wait(100);
  ok(!(await p.isVisible('#hbDlg')), 'Esc closes the hub');
  // every tile opens its tool
  const dls = [];
  p.on('download', (d) => dls.push(d.suggestedFilename()));
  const closeAll = async () => { await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close())); await wait(60); };
  for (const id of Object.keys(EXPECT)) {
    await closeAll(); await p.click('#views [data-v=today]'); await wait(80);
    await p.click('#hbBtn'); await wait(80);
    ok(await p.isVisible('#hbDlg'), 'header button opens the hub before ' + id);
    await p.click(`#hbBody [data-hbtool="${id}"]`); await wait(350);
    ok(!(await p.isVisible('#hbDlg')), id + ': hub closes');
    const ex = EXPECT[id];
    if (ex === 'download') ok(dls.length >= 1, 'backup tile starts a download');
    else if (ex.startsWith('view:')) ok(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).view) === ex.slice(5), `${id}: view ${ex.slice(5)}`);
    else ok(await p.isVisible(ex), `${id}: ${ex} is visible`);
  }
  ok(pe.length === 0, 'page errors while opening tools: ' + pe.join(' | '));
  // recents: newest first, max 6, persists after a reload, shown first
  await closeAll();
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.hub.recent')));
  ok(rec.length === 6 && rec[0] === 'backup' && rec[1] === 'alerts', 'recents newest first, capped at 6: ' + rec);
  await p.reload(); await wait(900);
  await p.click('#hbBtn'); await wait(100);
  ok((await p.$$eval('#hbBody .hub-sec', (n) => n.map((x) => x.textContent)))[0] === 'Recent', 'Recent shown first after a reload');
  const first = await p.$$eval('#hbBody .hub-grid', (g) => [...g[0].querySelectorAll('[data-hbtool]')].map((x) => x.dataset.hbtool));
  ok(first.join() === rec.join(), 'recent tiles in order: ' + first);
  // pin up to 4
  for (const id of ['bills', 'tilt', 'shifts', 'hours']) { await p.click(`#hbBody [data-hbfav="${id}"] >> nth=0`); await wait(60); }
  let favs = await p.evaluate(() => (JSON.parse(localStorage.getItem('planner.v1')).hub.find((x) => x.id === 'cfg') || {}).favs);
  ok(favs && favs.length === 4 && favs.join() === 'bills,tilt,shifts,hours', 'four pinned: ' + favs);
  await p.click('#hbBody [data-hbfav="deals"] >> nth=0'); await wait(150);
  favs = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).hub.find((x) => x.id === 'cfg').favs);
  ok(favs.length === 4 && !favs.includes('deals'), 'a fifth pin is refused: ' + favs);
  ok(/pin 4 tools/.test(await p.textContent('#toastMsg') || ''), 'toast explains the limit');
  await p.keyboard.press('Escape'); await wait(150);
  await p.reload(); await wait(1200);
  const quick = await p.$$eval('#hbQuick [data-hbgo]', (n) => n.map((x) => x.dataset.hbgo));
  ok(quick.join() === 'bills,tilt,shifts,hours', 'Quick tools row on Today after reload: ' + quick);
  await p.click('#hbQuick [data-hbgo="shifts"]'); await wait(300);
  ok(await p.isVisible('#shDlg'), 'a Quick tool opens its tool'); await closeAll();
  await p.click('#hbQuick [data-hbopen]'); await wait(150);
  ok(await p.isVisible('#hbDlg'), 'Quick tools "All tools" opens the hub');
  await p.click('#hbBody [data-hbfav="tilt"]'); await wait(150);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).hub.find((x) => x.id === 'cfg').favs)).join() === 'bills,shifts,hours', 'unpin works');
  // status chips from real data
  await closeAll();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); s.bills = [{ id: 'b1', name: 'Rent', amt: 900, freq: 'monthly', day: 17, dow: 0, ymd: '2026-10-17', end: '', created: 1 }]; s.deals = [{ id: 'd1', name: 'Acme', stage: 'lead', value: 100, follow: '2026-10-13', created: 1 }, { id: 'd2', name: 'Beta', stage: 'lead', value: 100, follow: '2026-10-12', created: 1 }]; localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(1000);
  await p.click('#hbBtn'); await wait(100);
  const chip = async (id) => (await p.textContent(`#hbBody [data-hbtool="${id}"]`)).replace(/\s+/g, ' ');
  ok(/next due in 3 days/.test(await chip('bills')), 'Bills chip: ' + await chip('bills'));
  ok(/2 follow-ups/.test(await chip('deals')), 'Deals chip: ' + await chip('deals'));
  ok(/0 h this week/.test(await chip('hours')), 'Hours chip: ' + await chip('hours'));
  ok(/last backup today/.test(await chip('backup')), 'Backup chip: ' + await chip('backup'));
  // phone width: the header fits and the hub does not scroll sideways
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll at 390px: ' + w);
  await closeAll();
  const hdr = await p.evaluate(() => { const r = document.querySelector('header .right, .top .right'); return r ? r.scrollWidth - r.clientWidth : 0; });
  ok(hdr <= 1, 'header fits: ' + hdr);
  // palette knows the tools
  await p.keyboard.press('Control+k'); await wait(150);
  for (const [q, want] of [['tilt', 'Tilt guard'], ['journal', 'Journal'], ['net worth', 'Net worth'], ['backup', 'Backup'], ['all tools', 'All tools'], ['miles', 'Miles'], ['prop', 'Prop firms'], ['taxes', 'Taxes'], ['business', 'Business'], ['payday', 'Payday'], ['edge', 'Edge finder'], ['hours', 'Hours'], ['availability', 'Availability'], ['daily score', 'Daily score'], ['daily brief', 'Daily brief'], ['phone alerts', 'Phone alerts'], ['cash flow', 'Cash flow'], ['bills', 'Bills'], ['setup', 'Setup'], ['time log', 'Time log']]) {
    await p.fill('#pkIn', q); await wait(80);
    const t = await p.$$eval('#pkList .pk-r b', (n) => n.map((x) => x.textContent));
    ok(t.includes(want), `palette "${q}" finds ${want}: ${t}`);
  }
  await p.fill('#pkIn', 'tilt'); await wait(80); await p.keyboard.press('Enter'); await wait(300);
  ok(await p.isVisible('#tsDlg'), 'palette runs a tool'); await closeAll();
  await p.screenshot({ path: '/tmp/hub-phone.png' });
  ok(pe.length === 0, 'page errors: ' + pe.join(' | '));
  await ctx.close();
  // desktop width
  const d = await open(b, { now: NOW, hash: '#tools', width: 1920 });
  ok(await d.p.isVisible('#hbDlg') && await d.p.isVisible('#hbBtn'), 'wide desktop: hub and header button');
  ok(/All tools/.test(await d.p.textContent('#hbBtn')), 'desktop button has a label');
  await d.p.screenshot({ path: '/tmp/hub-desktop.png' });
  ok(d.errs.length === 0, 'desktop page errors: ' + d.errs.join(' | '));
  await b.close();
  if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); } console.log('HUB OK');
})().catch((e) => { console.error(e.message.split('\n').slice(0, 5).join('\n')); process.exit(1); });
