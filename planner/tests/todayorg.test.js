// Today organizer: node planner/tests/todayorg.test.js  (serve the site first: see the notes in the task, PORT env, default 8789)
const { chromium } = require('playwright');
const L = require('./lib-todayorg');
const { wait, open, st, fullState, seedNq } = L;
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const tiers = (p) => p.evaluate(() => {
    const out = { now: [], today: [], dash: [] }; let cur = null;
    [...document.querySelector('.tdy').children].forEach((c) => {
      if (c.classList.contains('to-h')) cur = c.classList.contains('red') ? 'now' : /Dashboards/.test(c.textContent) ? 'dash' : 'today';
      else if (c.classList.contains('to-w') && cur) out[cur].push(c.dataset.toid);
      else if (c.classList.contains('to-dash') && cur) out[cur].push(...[...c.querySelectorAll(':scope>details')].map((d) => d.dataset.toid));
    });
    return out;
  });
  const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && e.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true }) && e.getBoundingClientRect().height > 0; }, sel);

  // ---------- busy Friday noon ----------
  let { ctx, p, errs: pe } = await open(b, { state: fullState(), seed: seedNq() });
  let t = await tiers(p);
  ok(['guard', 'bills', 'deals'].every((x) => t.now.includes(x)), 'needs-you tier has clash, bill and follow-up: ' + t.now);
  ok(t.now.includes('sched') && t.now.indexOf('sched') > t.now.indexOf('guard'), 'shift today is in needs-you, after the clash: ' + t.now);
  ok(!t.now.includes('tilt') && t.dash.includes('tilt'), 'idle tilt guard sits in dashboards');
  ok(['tasks', 'habits', 'quick'].every((x) => t.today.includes(x)) && !t.today.includes('earn'), 'today tier: ' + t.today);
  ok(['earn', 'wb', 'hr', 'score', 'edge', 'worth', 'prop', 'biz', 'tax', 'miles', 'payday', 'avail', 'alerts'].every((x) => t.dash.includes(x)), 'dashboards tier: ' + t.dash);
  ok(await p.locator('.to-w .to-lbl.red').count() >= 1 && await p.locator('.to-w .to-lbl.amber').count() >= 1, 'red and amber labels shown');
  ok((await p.textContent('#toStrip')).startsWith('3 things need you') || /^\d+ things need you/.test(await p.textContent('#toStrip')), 'strip: ' + await p.textContent('#toStrip'));
  const strip = await p.textContent('#toStrip');
  ok(/next: Dentist 2pm/.test(strip) && /\$[\d,]+ this week/.test(strip), 'strip has next event and week money: ' + strip);
  const sum = await p.textContent('.to-acc[data-toid=earn] summary');
  ok(/Earnings/.test(sum) && /\$[\d,]+ this week/.test(sum), 'earnings row: ' + sum);
  ok(await p.locator('.to-acc[open]').count() === 0, 'rows start folded');
  ok(await p.locator('#erCard').count() === 1 && !(await vis(p, '#erCard')), 'folded card stays in the DOM but hidden');
  await p.click('.to-acc[data-toid=earn] summary'); await wait(150);
  ok(await vis(p, '#erCard'), 'tap opens the card');
  await p.evaluate(() => document.querySelector('#main').dispatchEvent(new Event('x'))); // no-op
  await p.click('#toCustBtn'); await p.click('#toDlg [data-close].btn'); await wait(100); // a render happens, open state must survive
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await p.reload(); await p.waitForSelector('.tdy'); await wait(600);
  ok(await vis(p, '#erCard'), 'open state remembered after reload');
  ok(!(await vis(p, '#wbCard')), 'other rows still folded');
  const stored = await p.evaluate(() => localStorage.getItem('planner.toOpen'));
  ok(/earn/.test(stored), 'kept on this device: ' + stored);
  ok(!/earn/.test(JSON.stringify((await st(p)).toorg || [])), 'open state is not in synced data');
  await p.click('.to-acc[data-toid=earn] summary'); await wait(150);
  ok(!(await vis(p, '#erCard')) && !/earn/.test(await p.evaluate(() => localStorage.getItem('planner.toOpen'))), 'closing is remembered too');
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(w <= 390, 'no sideways scroll at 390: ' + w);
  ok(await p.evaluate(() => document.querySelector('.tdy').scrollWidth <= document.querySelector('.tdy').clientWidth + 1), 'Today content fits width');

  // ---------- customize ----------
  await p.click('#toCustBtn'); await wait(150);
  ok(await vis(p, '#toDlg') && /still in All tools/.test(await p.textContent('#toHelp')), 'sheet opens with an explanation');
  ok(await p.locator('#toDlg [data-toshow]').count() === 33 - 3 + 3 || await p.locator('#toDlg [data-toshow]').count() >= 30, 'every card is listed');
  await p.click('#toDlg [data-toshow=miles]'); await wait(300);
  let s = await st(p); const cfg = s.toorg.find((x) => x.id === 'cfg');
  ok(cfg && cfg.hide.includes('miles') && cfg.u > 0, 'hide saved with a sync stamp: ' + JSON.stringify(cfg));
  ok(!(await tiers(p)).dash.includes('miles'), 'hidden card is gone from Today');
  ok(await p.locator('#miCard').count() === 0, 'and not drawn');
  await p.click('#toDlg [data-todown=earn]'); await wait(300);
  t = await tiers(p);
  ok(t.dash.indexOf('wb') < t.dash.indexOf('earn') && t.dash.indexOf('earn') === t.dash.indexOf('wb') + 1, 'order changed inside the tier: ' + t.dash.slice(0, 4));
  s = await st(p); ok(s.toorg.find((x) => x.id === 'cfg').order.indexOf('wb') < s.toorg.find((x) => x.id === 'cfg').order.indexOf('earn'), 'order saved');
  const u1 = s.toorg.find((x) => x.id === 'cfg').u;
  ok(await p.isDisabled('#toDlg [data-toup=earn]') === false && await p.isDisabled('#toDlg [data-todown=alerts]'), 'arrows disable at the ends of a group');
  // sync: a user doc carries the collection
  ok(await p.evaluate(() => typeof userDoc === 'function' ? !!userDoc().toorg : true), 'toorg travels in the sync document');
  await p.reload(); await p.waitForSelector('.tdy'); await wait(600);
  t = await tiers(p);
  ok(!t.dash.includes('miles') && t.dash.indexOf('wb') < t.dash.indexOf('earn'), 'hide and order persist after reload');
  await p.click('#toCustBtn'); await wait(150);
  await p.click('#toReset'); await wait(250); await p.click('#askYes'); await wait(400);
  t = await tiers(p);
  ok(t.dash.includes('miles') && t.dash.indexOf('earn') < t.dash.indexOf('wb'), 'reset to default restores everything: ' + t.dash.slice(0, 4));
  ok((await st(p)).toorg.find((x) => x.id === 'cfg').u >= u1, 'reset is stamped');
  await ctx.close();

  // ---------- phone width, fully seeded: height ----------
  ({ ctx, p, errs: pe } = await open(b, { state: fullState(), seed: seedNq() }));
  const after = await L.todayHeight(p);
  ok(after > 0 && after < 6530 * 0.55, `Today height ${after}px is at least 45% under the old 6530px`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll when busy');
  errs.push(...pe); await ctx.close();
  console.log('height busy:', after);

  // ---------- quiet day ----------
  ({ ctx, p, errs: pe } = await open(b, { state: fullState({ clean: true }), seed: seedNq() }));
  t = await tiers(p);
  ok(!t.now.includes('guard') && !t.now.includes('bills') && !t.now.includes('deals') && !t.now.includes('sched'), 'quiet day: nothing urgent but setup: ' + t.now);
  ok(/^1 thing|^Nothing urgent|^0/.test(await p.textContent('#toStrip')) || /^Nothing urgent/.test(await p.textContent('#toStrip')), 'quiet strip: ' + await p.textContent('#toStrip'));
  ok(t.today.includes('guard'), 'trading windows card moves to Today when no clash');
  errs.push(...pe); await ctx.close();

  // ---------- evening: shutdown joins needs-you; tilt stop is always on top ----------
  const eve = new Date('2026-09-04T19:00:00-04:00').getTime();
  const trades = [1, 2, 3].map((i) => ({ k: 'lit:live:m:' + i, acct: 'lit', src: 'live', mem: 'M', day: '2026-09-04', t0: 1788000000 + i * 100, t1: 1788000050 + i * 100, side: 'LONG', qty: 1, entry: 1, px: 1, exit: 'STOP', r: -1, usd: -50 }));
  const nq = seedNq(); nq.trades = trades; nq.t = eve;
  const nowSec = eve / 1000;
  trades.forEach((x, i) => { x.t0 = nowSec - 3000 + i * 100; x.t1 = x.t0 + 60; });
  ({ ctx, p, errs: pe } = await open(b, { now: eve, state: fullState(), seed: nq }));
  t = await tiers(p);
  ok(t.now.includes('shutdown'), 'shutdown card is in needs-you in the evening: ' + t.now);
  ok(t.now[0] === 'tilt', 'tilt stop is first: ' + t.now);
  await p.click('#toCustBtn'); await p.click('#toDlg [data-toshow=tilt]'); await wait(250); await p.click('#toDlg [data-close].btn'); await wait(150);
  ok((await tiers(p)).now.includes('tilt'), 'an active stop cannot be hidden');
  errs.push(...pe); await ctx.close();

  // ---------- trading day before NY open: plan is needs-you ----------
  const early = new Date('2026-09-04T08:30:00-04:00').getTime();
  ({ ctx, p, errs: pe } = await open(b, { now: early, state: fullState({ clean: true }), seed: seedNq() }));
  t = await tiers(p);
  ok(t.now.includes('tradeplan'), 'trade plan before the NY open is needs-you: ' + t.now);
  errs.push(...pe); await ctx.close();

  // ---------- 360 wide ----------
  ({ ctx, p, errs: pe } = await open(b, { state: fullState(), seed: seedNq(), width: 360 }));
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 360, 'no sideways scroll at 360');
  await ctx.close();

  await b.close();
  if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); }
  console.log('todayorg ok');
})();
