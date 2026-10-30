const { chromium } = require('playwright');
const expand = require('./lib-expand');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
const errs = [];
(async () => {
  const ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); ctx.setDefaultTimeout(5000);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.goto(URL); await wait(3500);
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
  const today = await p.evaluate(() => { const d = new Date(), pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; });
  await p.click('#views [data-v=health]'); await wait(300);
  ok(/Health/.test(await p.textContent('#title')) && await p.locator('.hx-card').count() >= 5, 'health view renders');
  // check-in
  await p.click('[data-hx="sleep+"]'); let h = (await st()).health.find((x) => x.date === today); ok(h && h.sleepH === 8, 'sleep+ starts from target 7.5 -> 8: ' + JSON.stringify(h));
  await p.click('[data-hx="sleep-"]'); await p.click('[data-hx="sleep-"]'); h = (await st()).health.find((x) => x.date === today); ok(h.sleepH === 7, 'sleep- steps by 0.5: ' + h.sleepH);
  await p.click('[data-hx="set:energy:4"]'); await p.click('[data-hx="set:stress:2"]'); await p.click('[data-hx="set:sleepQ:3"]');
  for (let i = 0; i < 3; i++) await expand(p, 'health'); await p.click('[data-hx="water+"]'); await p.click('[data-hx="caf+"]'); await p.click('[data-hx="caf+"]'); await p.click('[data-hx="caf-"]');
  await p.fill('#hxSteps', '8,432'); await p.press('#hxSteps', 'Tab'); await p.fill('#hxWeight', '181.4'); await p.press('#hxWeight', 'Tab'); await wait(300);
  h = (await st()).health.find((x) => x.date === today);
  ok(h.energy === 4 && h.stress === 2 && h.sleepQ === 3 && h.water === 3 && h.caf === 1 && h.steps === 8432 && h.weight === 181.4, 'check-in saved ' + JSON.stringify(h));
  await p.click('[data-hx="set:energy:4"]'); ok(((await st()).health.find((x) => x.date === today)).energy === 0, 'tapping again clears');
  await p.click('[data-hx="set:energy:4"]');
  // previous day navigation and backfill
  await p.click('[data-hxd="-1"]'); await wait(200); ok(!(await p.isDisabled('[data-hxd="1"]')) , 'can move forward again'); await expand(p, 'health'); await p.click('[data-hx="water+"]');
  const y = await p.evaluate((t) => { const d = new Date(t + 'T12:00'); d.setDate(d.getDate() - 1); const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }, today);
  ok(((await st()).health.find((x) => x.date === y) || {}).water === 1, 'backfilled yesterday'); await p.click('[data-hxd="1"]'); ok(await p.isDisabled('[data-hxd="1"]'), 'cannot go into the future');
  // sleep planner math: wake 07:00, need 7.5 -> bed 11:30pm
  ok(/bed by 11:30pm/.test(await p.textContent('.hx')), 'bedtime math: ' + (await p.textContent('.hx')).match(/bed by [^.]*/i));
  await p.fill('#hxWake', '06:00'); await p.press('#hxWake', 'Tab'); await wait(200); ok(/bed by 10:30pm/.test(await p.textContent('.hx')), 'bedtime follows wake time');
  // workout log with exercises, template
  await p.click('.hx-card [data-hx="logw"]'); await wait(200); ok(await p.isVisible('#wkDlg'), 'workout dialog');
  await p.fill('#wkMins', '50'); await p.selectOption('#wkRpe', '7'); await p.click('#wkAddEx'); await p.fill('#wkEx [data-f=name]', 'Bench press');
  await p.fill('#wkEx .set [data-f=r]', '8'); await p.fill('#wkEx .set [data-f=w]', '135'); await p.click('#wkEx [data-wk=addset]'); await p.click('#wkAddEx'); await p.locator('#wkEx [data-f=name]').nth(1).fill('Squat');
  await p.locator('#wkEx .hx-ex').nth(1).locator('[data-f=r]').first().fill('5'); await p.locator('#wkEx .hx-ex').nth(1).locator('[data-f=w]').first().fill('225');
  await p.check('#wkSaveTpl'); await p.fill('#wkTplName', 'Full body');
  await p.click('#wkForm button[type=submit]'); await wait(400);
  let s = await st(); const w1 = s.workouts[0]; ok(s.workouts.length === 1 && w1.type === 'Lift' && w1.mins === 50 && w1.ex.length === 2 && w1.ex[0].sets.length === 2 && w1.ex[0].sets[1].w === 135, 'workout saved ' + JSON.stringify(w1));
  ok(s.wtemplates.length === 1 && s.wtemplates[0].name === 'Full body' && s.wtemplates[0].ex.length === 2, 'template saved');
  // validation
  await p.click('.hx-card [data-hx="logw"]'); await p.fill('#wkMins', '9999'); await p.click('#wkForm button[type=submit]'); ok(await p.isVisible('#wkErr'), 'minutes validated'); await p.keyboard.press('Escape');
  // workouts tab: PRs, plan, calendar
  await p.click('[data-hxtab=workouts]'); await wait(200);
  ok(/Bench press/.test(await p.textContent('.hx')) && /Personal bests/.test(await p.textContent('.hx')), 'PRs listed');
  await p.selectOption('[data-hxplan="1"]', 'Lift'); await p.selectOption('[data-hxplan="3"]', 'Run'); await p.selectOption('[data-hxplan="5"]', 'Lift'); await wait(200);
  await p.click('[data-hx="plan-cal"]'); await wait(400);
  let ev = (await st()).events.filter((e) => /^hxplan-/.test(e.id)); ok(ev.length === 3 && ev.every((e) => e.repeat === 'weekly' && e.start === '06:30'), 'plan events: ' + ev.map((e) => e.id + e.title).join());
  await p.selectOption('[data-hxplan="3"]', 'Rest'); await p.click('[data-hx="plan-cal"]'); await wait(400);
  ev = (await st()).events.filter((e) => /^hxplan-/.test(e.id)); ok(ev.length === 2 && !ev.some((e) => e.id === 'hxplan-3'), 'rest day removes its event');
  // template use shows last-time hint and prefill
  await p.click('[data-hx^="tpl-use:"]'); await wait(300);
  ok(await p.locator('#wkEx .hx-ex').count() === 2 && (await p.inputValue('#wkEx .set [data-f=w]')) === '135', 'template prefilled from last time');
  ok(/Last time/.test(await p.textContent('#wkEx')), 'last-time hint'); await p.keyboard.press('Escape');
  // edit + delete
  await p.click('.hx-wk >> nth=0'); ok(await p.isVisible('#wkDlg') && await p.isVisible('#wkDelete'), 'edit opens'); await p.click('#wkDelete'); await p.click('#askYes'); await wait(300); ok((await st()).workouts.length === 0, 'delete workout');
  // trends
  await p.click('[data-hxtab=trends]'); await wait(200);
  ok(await p.locator('.hx-bars').count() >= 3 && /What your data says/.test(await p.textContent('.hx')), 'trends render'); ok(await p.locator('.hx-ins .dim').count() >= 2, 'insights say when data is insufficient');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('planner.v1')); const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); const pad = (v) => String(v).padStart(2, '0'); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
    for (let i = 1; i <= 12; i++) { s.health.push({ id: 'h:' + d(i + 1), date: d(i + 1), sleepH: i % 2 ? 8 : 6, energy: i % 2 ? 4 : 2, weight: 180 - i * 0.2 }); s.journal.push({ id: 'j:' + d(i + 1), date: d(i + 1), note: '', mood: 3, rules: i % 2 ? 'yes' : 'no' }); }
    localStorage.setItem('planner.v1', JSON.stringify(s)); });
  await p.reload(); await wait(1500); await p.click('#views [data-v=health]'); await p.click('[data-hxtab=trends]'); await wait(300);
  ok(/Rules followed on <b>100%|Rules followed on 100%/.test(await p.innerHTML('.hx-ins')) || /100%/.test(await p.textContent('.hx-ins')), 'insight computed: ' + (await p.textContent('.hx-ins')).slice(0, 160));
  ok(await p.locator('.hx svg polyline').count() === 1, 'weight chart');
  await p.screenshot({ path: 'shots/H-trends.png', fullPage: true });
  // today card + deep link + phone
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); m.on('pageerror', (e) => errs.push('m ' + e.message));
  await m.goto(URL); await wait(3500);
  ok(/Health/.test(await m.textContent('.tdy')), 'health card on Today'); await expand(m, 'health'); await m.click('.tdy [data-hx="water+"]'); await wait(300);
  { const mh = await m.evaluate((t) => (JSON.parse(localStorage.getItem('planner.v1')).health.find((x) => x.date === t) || {}).water, today); ok(mh === 1, 'water from Today card ' + mh); }
  await m.click('#moreBtn'); await m.click('#moreMenu [data-v=health]'); await wait(300);
  for (const t of ['today', 'workouts', 'trends']) { await m.click(`[data-hxtab=${t}]`); await wait(200); ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'phone overflow in ' + t); if (t === 'today') await m.screenshot({ path: 'shots/H-phone.png' }); }
  await m.goto(URL + '#log-workout'); await wait(1500); ok(await m.isVisible('#wkDlg'), '#log-workout deep link');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'HEALTH OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 5).join('\n')); console.log(errs.join('\n')); process.exit(1); });
