// Tilt guard: node planner/tests/tilt.test.js  (serve the site first, PORT env, default 8781; see shifts.test.js)
const { chromium } = require('playwright');
const { wait, nqCache, trade, open, st } = require('./lib-money');
const sec = (iso) => Math.round(Date.parse(iso) / 1000);
const DAY = '2026-11-03'; // a Tuesday; EST, so 15:00Z is 10:00 in New York
const T = (a, b, usd) => trade(DAY, sec(`${DAY}T${a}:00Z`), sec(`${DAY}T${b}:00Z`), usd);
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = Date.parse(`${DAY}T15:10:00Z`); // 10:10 ET
  const noW = (p) => p.evaluate(() => document.documentElement.scrollWidth);

  // ---- 1. no trades at all: nothing triggers ----
  {
    const { p, errs: pe } = await open(b, { now, seed: nqCache(now, { day: DAY, bots: { lit: { dll: 1000 }, atlas: { dll: 600 } } }) });
    ok(!(await p.locator('#tlBan').count()), 'no trades: no banner');
    ok(/0 live\/paper trades today/.test(await p.textContent('#tlCard')) && /0 \/ 0/.test(await p.textContent('#tlRecord')), 'no trades: calm card ' + await p.textContent('#tlCard'));
    ok(/\$600 daily loss/.test(await p.textContent('#tlCard')), 'daily stop defaults to the smallest dashboard limit');
    errs.push(...pe);
  }
  // ---- 2. two losses in a row: stop, countdown, now bar, log why, record ----
  {
    const trades = [T('14:35', '14:45', -100), T('14:50', '15:00', -150)];
    const { p, errs: pe } = await open(b, { now, seed: nqCache(now, { day: DAY, trades, bots: { lit: { dll: 1000 } } }) });
    ok(await p.isVisible('#tlBan') && /Stop trading/.test(await p.textContent('#tlBan')), 'banner after 2 losses');
    ok(/2 losing trades in a row/.test(await p.textContent('#tlBan')), 'says why: ' + await p.textContent('#tlBan'));
    const cd1 = await p.textContent('#tlBan [data-tiltcd]'); ok(/^(19|20):\d\d$/.test(cd1), 'cooldown about 20 min: ' + cd1);
    await p.clock.fastForward(5000); await wait(1300);
    const cd2 = await p.textContent('#tlBan [data-tiltcd]'); ok(cd2 !== cd1, 'countdown ticks live: ' + cd1 + ' -> ' + cd2);
    ok(/-\$250/.test(await p.textContent('#tlCard')), 'today P&L shown');
    await p.evaluate(() => document.querySelector('#views [data-v=month]').click()); await wait(300);
    ok(await p.isVisible('#nowbar') && /Stop trading/.test(await p.textContent('#nowbar')) && (await p.locator('#nowbar [data-tiltcd]').count()) === 1, 'Now bar shows the stop with countdown: ' + await p.textContent('#nowbar'));
    await p.click('#nowbar [data-tiltlog]'); await wait(300);
    ok(await p.isVisible('#tlDlg'), 'tap opens the log dialog');
    await p.click('#tlSave'); ok(await p.isVisible('#tlErr'), 'needs a line first');
    await p.click('[data-tlwhy="FOMO"]'); await p.fill('#tlText', 'Chased the second entry');
    await p.click('#tlSave'); await wait(400);
    const s = await st(p);
    const j = s.journal.find((x) => x.id.startsWith('j:'));
    ok(j && /\[Tilt stop/.test(j.note) && /Chased the second entry/.test(j.note) && /2 losing trades/.test(j.note), 'journal note written: ' + (j && j.note));
    ok(s.tilt.some((x) => /^ack:/.test(x.id) && x.why), 'ack saved in the synced collection');
    await p.evaluate(() => document.querySelector('#views [data-v=today]').click()); await wait(300);
    ok(/Logged/.test(await p.textContent('#tlBan')), 'banner stays during the cooldown but says logged');
    await p.clock.fastForward(21 * 60 * 1000); await wait(1500);
    ok(!(await p.locator('#tlBan').count()), 'banner clears after the cooldown once logged');
    ok(/1 \/ 0/.test(await p.textContent('#tlRecord')), 'discipline record: 1 followed, 0 broken: ' + await p.textContent('#tlRecord'));
    ok((await noW(p)) <= 390, 'no sideways scroll');
    errs.push(...pe);
  }
  // ---- 3. cooldown over and not logged: amber, then a trade taken during the cooldown breaks the stop ----
  {
    const later = Date.parse(`${DAY}T15:45:00Z`);
    const trades = [T('14:35', '14:45', -100), T('14:50', '15:00', -150)];
    const { p, errs: pe } = await open(b, { now: later, seed: nqCache(later, { day: DAY, trades }) });
    ok(/Cooldown is over/.test(await p.textContent('#tlBan')) && /I understand, log why/.test(await p.textContent('#tlBan')), 'after the cooldown, unlogged: reminder stays');
    errs.push(...pe);
    const { p: q, errs: qe } = await open(b, { now, seed: nqCache(now, { day: DAY, trades: [...trades, T('15:05', '15:08', 80)] }) });
    ok(/traded 1 time after the stop/.test(await q.textContent('#tlBan')), 'trade during cooldown flagged');
    ok(/0 \/ 1/.test(await q.textContent('#tlRecord')), 'record counts it as broken: ' + await q.textContent('#tlRecord'));
    errs.push(...qe);
  }
  // ---- 4. daily loss stop (dashboard limit as default) ----
  {
    const later = Date.parse(`${DAY}T16:30:00Z`);
    const { p, errs: pe } = await open(b, { now: later, seed: nqCache(later, { day: DAY, trades: [T('14:35', '14:45', -650)], bots: { atlas: { dll: 600 } } }) });
    ok(/Daily loss stop hit/.test(await p.textContent('#tlBan')) && /Done for today/.test(await p.textContent('#tlBan')), 'daily loss stop stays all day: ' + await p.textContent('#tlBan'));
    // settings: raise the daily stop above the loss -> no stop; the settings are a synced collection
    await p.evaluate(() => { location.hash = '#tilt'; }); await wait(500);
    ok(await p.isVisible('#tsDlg'), '#tilt opens settings');
    ok(/\$600/.test(await p.textContent('#tsDash')), 'shows the dashboard limit');
    await p.fill('#tsStop', '1000'); await p.press('#tsStop', 'Tab'); await wait(200);
    await p.fill('#tsCool', '15'); await p.press('#tsCool', 'Tab'); await wait(200);
    const cfg = (await st(p)).tilt.find((x) => x.id === 'cfg'); ok(cfg && cfg.stop === 1000 && cfg.cool === 15, 'settings saved ' + JSON.stringify(cfg));
    await p.click('#tsDlg .btn.primary'); await wait(300);
    ok(!(await p.locator('#tlBan').count()), 'a looser daily stop clears it');
    ok(/15 min cooldown/.test(await p.textContent('#tlCard')), 'card reflects the settings');
    errs.push(...pe);
  }
  // ---- 5. streak of 2 with max losing trades set to 3: no stop; trades on another day never count ----
  {
    const trades = [T('14:35', '14:45', -100), T('14:50', '15:00', -150), trade('2026-11-02', sec('2026-11-02T14:30:00Z'), sec('2026-11-02T14:40:00Z'), -999)];
    const { p, errs: pe } = await open(b, { now, seed: nqCache(now, { day: DAY, trades }) });
    ok(await p.isVisible('#tlBan'), 'default 2 triggers');
    await p.evaluate(() => { location.hash = '#tilt'; }); await wait(400);
    await p.fill('#tsMax', '3'); await p.press('#tsMax', 'Tab'); await wait(200);
    await p.click('#tsDlg .btn.primary'); await wait(300);
    ok(!(await p.locator('#tlBan').count()), 'max 3: two losses do not trigger');
    ok(!/999/.test(await p.textContent('#tlCard')), 'yesterday is not counted today');
    ok((await noW(p)) <= 390, 'no sideways scroll');
    await p.screenshot({ path: '/tmp/tilt.png' });
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('TILT OK');
})();
