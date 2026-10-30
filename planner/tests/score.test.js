// Daily score and streaks: node planner/tests/score.test.js  (serve the site first, PORT env, default 8783; see shifts.test.js)
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, open, st, etTrade } = require('./lib-fin');
const NOW = Date.parse('2026-12-02T15:10:00Z'); // Wednesday 10:10 ET
const day = (a, b) => { const out = []; for (let d = Date.parse(a + 'T12:00:00Z'); d <= Date.parse(b + 'T12:00:00Z'); d += 864e5) out.push(new Date(d).toISOString().slice(0, 10)); return out; };
const streakA = day('2026-11-10', '2026-11-19'), streakB = [...day('2026-11-23', '2026-11-24'), ...day('2026-11-26', '2026-12-01')];
const habitDone = [...streakA, ...streakB, '2026-11-25', '2026-12-02']; // done on every day with a score, plus today
const journal = [...streakA, ...streakB.filter((d) => d !== '2026-12-01')].map((d) => ({ id: 'j:' + d, date: d, note: '', mood: 0, rules: 'yes' }))
  .concat([{ id: 'j:2026-11-25', date: '2026-11-25', note: '', mood: 0, rules: 'no' }, { id: 'j:2026-12-01', date: '2026-12-01', note: '', mood: 0, rules: 'partly' }]);
const workouts = [...streakB].map((d) => ({ id: 'w' + d, date: d, type: 'Lift', mins: 30, rpe: 6, notes: '', ex: [] })); // none on Nov 25 and today
const shift = (date) => ({ id: 'sh' + date, title: 'Outback shift', cat: 'job-outback', date, start: '16:00', end: '22:00', allDay: false, repeat: 'none', until: '', ex: [], notes: '', proj: '' });
const state = {
  habits: [{ id: 'h1', name: 'Pre-market routine', color: '#2563eb', days: [0, 1, 2, 3, 4, 5, 6], done: habitDone, created: '2026-11-01' }, { id: 'h2', name: 'Read', color: '#d97706', days: [0, 1, 2, 3, 4, 5, 6], done: [], created: '2026-12-02' }],
  journal, workouts, events: [shift('2026-12-01'), shift('2026-12-02')],
  tasks: [1, 2, 3, 4].map((i) => ({ id: 't' + i, title: 'Task ' + i, date: '2026-12-02', done: i <= 2, proj: '', p: 0 })),
};
// Nov 27: two losses then a trade inside the cooldown (stop broken). Nov 30: two losses and then nothing (stop respected).
const trades = [etTrade('2026-11-27', '09:35', -100), etTrade('2026-11-27', '09:45', -100), etTrade('2026-11-27', '10:00', 50), etTrade('2026-11-30', '09:35', -100), etTrade('2026-11-30', '09:45', -100)];
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const noW = (p) => p.evaluate(() => document.documentElement.scrollWidth);
  const txt = async (p, sel) => (await expand.within(p, sel), await p.innerText(sel)).replace(/\s+/g, ' ');

  // ---- nothing known: no number, no fake zero ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}) });
    ok(await p.textContent('#scNow') === '-' && /Nothing to score yet today/.test(await txt(p, '#scMissC')), 'empty day shows - and no score: ' + await txt(p, '#scCard'));
    ok(await p.textContent('#scStreak') === '0', 'no streak');
    errs.push(...pe);
  }
  // ---- seeded history ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, { trades }), state });
    ok(await p.textContent('#scNow') === '29', 'today is 29 (parts with data only): ' + await p.textContent('#scNow'));
    ok(await p.textContent('#scStreak') === '6' && await p.textContent('#scBestC') === '10', `streaks cur 6 best 10: ${await p.textContent('#scStreak')} / ${await p.textContent('#scBestC')}`);
    ok(await p.locator('#scCard .sc-spark circle').count() === 14 && await p.locator('#scCard .sc-spark circle.ok').count() === 9, 'sparkline has 14 dots, 9 of them 70+: ' + await p.locator('#scCard .sc-spark circle').count() + '/' + await p.locator('#scCard .sc-spark circle.ok').count());
    ok(/\+25 if you finish your shift/.test(await p.textContent('#scMissC')), 'biggest missing item first: ' + await p.textContent('#scMissC'));
    ok((await noW(p)) <= 390, 'Today: no sideways scroll ' + await noW(p));
    await expand(p, 'score'); await p.click('[data-scopen]'); await wait(300);
    ok(await p.isVisible('#scDlg') && await p.textContent('#scBig') === '29', 'sheet shows 29');
    const miss = await txt(p, '#scMiss');
    ok(/\+17 if you log your workout/.test(miss) && /\+13 if you check in Read/.test(miss) && /\+17 if you finish 2 more tasks/.test(miss) && /\+25 if you finish your shift/.test(miss), 'missing list: ' + miss);
    ok(/Counts once you answer "Followed my rules\?"|\+14 if you answer "Followed my rules\?"/.test(miss), 'rules not logged yet is offered, not counted as zero: ' + miss);
    ok(await p.locator('#scDlg [data-scrow]').count() === 7, 'seven parts listed');
    ok(/not counted today \(no data\)/.test(await txt(p, '[data-scrow=rules]')) && /not counted today/.test(await txt(p, '[data-scrow=tilt]')) && /15 pts/.test(await txt(p, '[data-scrow=shifts]')), 'weights shown, no-data parts flagged');
    ok(/0 of 1 shift worked/.test(await txt(p, '[data-scrow=shifts]')) && /2 of 4 tasks done/.test(await txt(p, '[data-scrow=tasks]')) && /1 of 2 habits done/.test(await txt(p, '[data-scrow=habits]')), 'today details');
    const chips = await txt(p, '#scDays');
    ok(/Tue 86/.test(chips), 'Dec 1: past shift counts as worked: ' + chips);
    ok(/Fri 80/.test(chips), 'Nov 27: a stop that was broken costs the tilt part: ' + chips);
    ok(/Mon 100/.test(chips), 'Nov 30: a respected stop keeps 100: ' + chips);
    ok(/Wed 29/.test(chips), 'today: ' + chips);
    ok((await noW(p)) <= 390, 'no sideways scroll ' + await noW(p));
    await p.screenshot({ path: '/tmp/score.png' });
    // switch the workout part off
    await p.click('[data-scon=work]'); await wait(300);
    ok(await p.textContent('#scBig') === '35', 'workout off: score 35 ' + await p.textContent('#scBig'));
    ok(/Switched off/.test(await txt(p, '[data-scrow=work]')) && !/workout/.test(await txt(p, '#scMiss')), 'workout leaves the missing list');
    ok(JSON.stringify((await st(p)).score) && (await st(p)).score.find((x) => x.id === 'cfg').off.join() === 'work', 'saved in the synced collection: ' + JSON.stringify((await st(p)).score));
    await p.click('#scDlg [data-close]'); await wait(200);
    ok(await p.textContent('#scNow') === '35', 'card follows the setting');
    await p.reload(); await wait(800);
    ok(await p.textContent('#scNow') === '35', 'setting survives a reload');
    errs.push(...pe);
  }
  // ---- deep link ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), state, hash: '#score' });
    ok(await p.isVisible('#scDlg'), '#score opens the sheet');
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('SCORE OK');
})();
