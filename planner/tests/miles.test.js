// Mileage and work expenses: node planner/tests/miles.test.js  (serve the site first, PORT env, default 8784; see shifts.test.js)
process.env.PORT = process.env.PORT || '8784';
const fs = require('fs');
const { chromium } = require('playwright');
const { wait, nqCache, open, st } = require('./lib-money');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const now = new Date('2026-11-03T15:00:00Z').getTime(); // Tuesday 10am New York
  const state = { v: 1, view: 'today', categories: [{ id: 'personal', name: 'Personal', color: '#64748b' }], jobs: [{ id: 'job-electric', name: 'Electric', color: '#2563eb', start: '07:00', end: '15:30', rate: 25, days: [] }] };
  const { p, errs: pe } = await open(b, { now, seed: nqCache(now), state, hash: '#miles' });
  ok(await p.isVisible('#miDlg'), '#miles opens the sheet');
  ok(/not tax advice/i.test(await p.textContent('#miDlg')) && /assumption/i.test(await p.textContent('#miDlg')), 'labelled as the user\'s own estimate and assumptions');
  ok((await p.inputValue('#miRate')) === '0.7' && (await p.inputValue('#miTax')) === '22', 'default rate 0.70 and tax 22 as editable assumptions');
  ok(!(await p.locator('#miRepeat').count()), 'no repeat button before a first trip');
  // log a trip
  await p.fill('#miMiles', '18.4'); await p.fill('#miFrom', 'Home'); await p.fill('#miTo', 'Job site'); await p.fill('#miJob', 'Electric');
  await p.click('#miSave'); await wait(200);
  let s = await st(p);
  ok(s.miles.length === 1 && s.miles[0].kind === 'trip' && s.miles[0].miles === 18.4 && s.miles[0].rate === 0.7 && s.miles[0].date === '2026-11-03', 'trip saved with the rate it was logged at: ' + JSON.stringify(s.miles));
  ok(/18\.4 mi/.test(await p.textContent('#miTiles')) && /\$12\.88/.test(await p.textContent('#miTiles')), 'tiles: 18.4 mi and $12.88 (18.4 x 0.70): ' + await p.textContent('#miTiles'));
  ok(/\$2\.83/.test(await p.textContent('#miTiles')), 'tax saved 22% of 12.88 = 2.83');
  // repeat last trip
  ok(/Home to Job site/.test(await p.textContent('#miRepeat')), 'repeat button names the trip');
  await p.click('#miRepeat'); await wait(200);
  s = await st(p);
  ok(s.miles.length === 2 && s.miles[1].from === 'Home' && s.miles[1].miles === 18.4, 'one tap repeats the last trip');
  ok(await p.isVisible('#toast.on'), 'toast with undo shown');
  // favorite
  await p.fill('#miMiles', '18.4'); await p.fill('#miFrom', 'Home'); await p.fill('#miTo', 'Job site');
  await p.click('#miFavAdd'); await wait(150);
  s = await st(p);
  ok(s.milecfg.filter((x) => /^fav:/.test(x.id)).length === 1, 'favorite saved');
  await p.click('[data-mifav]'); await wait(200);
  ok((await st(p)).miles.length === 3, 'favorite logs a trip in one tap');
  // changing the rate does not rewrite old trips
  await p.fill('#miRate', '0.725'); await p.press('#miRate', 'Tab'); await wait(200);
  s = await st(p);
  ok(s.milecfg.find((x) => x.id === 'cfg').rate === 0.725 && s.miles.every((m) => m.rate === 0.7), 'rate saved, old trips keep theirs');
  await p.fill('#miMiles', '10'); await p.click('#miSave'); await wait(200);
  s = await st(p);
  ok(s.miles.filter((m) => m.rate === 0.725).length === 1, 'new trip uses the new rate');
  // expense with money-log entry
  await p.click('[data-mimode="exp"]');
  await p.fill('#miAmt', '42.50'); await p.selectOption('#miCat', 'Tools'); await p.fill('#miNote', 'Wire strippers'); await p.fill('#miJob', 'Electric');
  ok(!(await p.isChecked('#miMoney')), 'money-log checkbox is off by default');
  await p.click('#miSave'); await wait(200);
  s = await st(p);
  const e1 = s.miles.find((m) => m.kind === 'exp');
  ok(e1 && e1.amt === 42.5 && e1.cat === 'Tools' && !e1.mid && s.money.length === 0, 'expense saved without a money entry');
  await p.click('[data-mimode="exp"]'); await p.fill('#miAmt', '100'); await p.selectOption('#miCat', 'Materials'); await p.check('#miMoney'); await p.click('#miSave'); await wait(200);
  s = await st(p);
  const e2 = s.miles.find((m) => m.amt === 100);
  ok(e2 && e2.mid && s.money.length === 1 && s.money[0].kind === 'out' && s.money[0].amt === 100 && s.money[0].date === '2026-11-03' && /Materials/.test(s.money[0].note), 'matching money out entry: ' + JSON.stringify(s.money));
  // totals: trips 18.4*3 at .7 = 38.64, 10 at .725 = 7.25, expenses 142.50 => 188.39; saved 22% = 41.45
  const tiles = await p.textContent('#miTiles');
  ok(/\$188\.39/.test(tiles) && /\$41\.45/.test(tiles), 'year deduction and tax saved: ' + tiles);
  ok(/This month/.test(await p.textContent('#miMonth')), 'month line');
  // edit then delete the expense that is in the money log
  await p.click(`[data-miedit="${e2.id}"]`); await p.fill('#miAmt', '120'); await p.click('#miSave'); await wait(200);
  s = await st(p);
  ok(s.miles.find((m) => m.id === e2.id).amt === 120 && s.money[0].amt === 120, 'editing updates the money entry too');
  await p.click(`[data-miedit="${e2.id}"]`); await p.click('#miDel'); await p.click('#askYes'); await wait(250);
  s = await st(p);
  ok(!s.miles.some((m) => m.id === e2.id) && s.money.length === 0, 'delete removes the money entry too');
  // CSV
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#miCsv')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(/^Date,Type,From,To/.test(csv) && /2026-11-03,Trip,Home,Job site,Electric,Mileage,,18.4,0.7,,12.88/.test(csv) && /Expense/.test(csv) && /Wire strippers/.test(csv), 'CSV rows: ' + csv.slice(0, 300));
  ok(/not tax advice/i.test(csv) && /\r\n/.test(csv), 'CSV carries the disclaimer and CRLF');
  // today card
  await p.click('#miDlg [data-close]');
  ok(/Miles and expenses/.test(await p.textContent('#miCard')) && /Repeat last trip/.test(await p.textContent('#miCard')), 'Today card');
  const before = (await st(p)).miles.length;
  await p.click('[data-mirepeat]'); await wait(200);
  ok((await st(p)).miles.length === before + 1, 'repeat from the Today card');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on Today');
  await p.click('[data-miopen]'); await wait(200);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#miBody').scrollWidth <= document.querySelector('#miBody').clientWidth), 'sheet fits at 390px');
  await p.screenshot({ path: '/tmp/miles-sheet.png' });
  ok(pe.length === 0, 'no page errors: ' + pe.join(' | '));
  await b.close();
  if (errs.length) { console.log('FAIL\n' + errs.join('\n')); process.exit(1); } console.log('MILES OK');
})().catch((e) => { console.error(e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
