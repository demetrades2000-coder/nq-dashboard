// Net worth and savings: node planner/tests/worth.test.js  (serve the site first, PORT env, default 8783; see shifts.test.js)
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, open, st } = require('./lib-fin');
const NOW = Date.parse('2026-12-02T15:10:00Z'); // Wednesday 10:10 ET
const acct = (n, name, kind, bal) => ({ id: 'a:' + n, name, kind, bal, c: n, d: '2026-11-20' });
const snap = (date, total) => ({ id: 's:' + date, date, total });
const worth = [acct(1, 'Checking', 'cash', 2000), acct(2, 'Ally savings', 'savings', 6000), acct(3, 'Webull', 'brokerage', 3000), acct(4, 'MFFU payout', 'payout', 1500), acct(5, 'Car loan', 'debt', 4000),
  snap('2026-06-20', 3000), snap('2026-08-10', 4200), snap('2026-10-05', 6000), snap('2026-11-20', 7000), { id: 'cfg', goal: 10000, goalDate: '2027-06-02' }];
const bills = [{ id: 'b1', name: 'Rent', amt: 1500, freq: 'monthly', day: 1, ymd: '2026-01-01' }, { id: 'b2', name: 'Phone', amt: 100, freq: 'monthly', day: 5, ymd: '2026-01-05' },
  { id: 'b3', name: 'Domain', amt: 1200, freq: 'yearly', day: 1, ymd: '2026-03-01' }, { id: 'b4', name: 'Gym', amt: 25, freq: 'weekly', dow: 2, ymd: '2026-01-06' }];
const monthly = 1500 + 100 + 1200 / 12 + 25 * 52 / 12; // 1808.33
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const noW = (p) => p.evaluate(() => document.documentElement.scrollWidth);
  const txt = async (p, sel) => (await expand.within(p, sel), await p.innerText(sel)).replace(/\s+/g, ' ');
  const wl = async (p) => ((await st(p)) || {}).worth || [];
  const snapOf = async (p, d) => ((await st(p)).worth.find((x) => x.id === 's:' + d) || {}).total;

  // ---- nothing set up ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}) });
    ok(/Set up/.test(await txt(p, '#wtCard')) && /own numbers|You type the balances/.test(await txt(p, '#wtCard')), 'empty card invites set up: ' + await txt(p, '#wtCard'));
    await expand(p, 'worth'); await p.click('[data-wtopen]'); await wait(300);
    ok(await p.isVisible('#wtDlg') && await p.isVisible('#wtEmpty') && /No accounts yet/.test(await txt(p, '#wtList')), 'empty sheet');
    // add the first account by hand
    await p.click('#wtAdd'); ok(!(await wl(p)).length, 'needs a name first');
    await p.fill('#wtName', 'Chase checking'); await p.click('#wtAdd'); ok(!(await wl(p)).length, 'needs a balance');
    await p.fill('#wtNew', '1200.50'); await p.click('#wtAdd'); await wait(300);
    const s = await st(p), a = s.worth.find((x) => x.id.startsWith('a:'));
    ok(a && a.name === 'Chase checking' && a.kind === 'cash' && a.bal === 1200.5, 'account saved: ' + JSON.stringify(a));
    ok(await snapOf(p, '2026-12-02') === 1200.5, 'a snapshot for today was stored');
    ok(/\$1,201/.test(await p.textContent('#wtTotal')), 'total shown: ' + await p.textContent('#wtTotal'));
    ok(/not enough updates yet/.test(await txt(p, '#wtChg')), 'no fake change with one snapshot: ' + await txt(p, '#wtChg'));
    ok(/Add your bills in Bills, or type your monthly expenses/.test(await txt(p, '#wtEf')) && await p.isVisible('#wtExp'), 'asks for monthly expenses when there are no bills');
    await p.fill('#wtExp', '2400'); await p.press('#wtExp', 'Tab'); await wait(300);
    ok(/0\.5 months of expenses covered/.test(await txt(p, '#wtEf')) && /the number you typed/.test(await txt(p, '#wtEf')), 'emergency fund from typed expenses: ' + await txt(p, '#wtEf'));
    ok((await st(p)).worth.find((x) => x.id === 'cfg').exp === 2400, 'expenses saved');
    errs.push(...pe);
  }
  // ---- a full set ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}), state: { worth, bills }, hash: '#worth' });
    ok(await p.isVisible('#wtDlg'), '#worth opens the sheet');
    await p.evaluate(() => document.getElementById('wtDlg').close()); await wait(300);
    ok((await noW(p)) <= 390, 'Today: no sideways scroll ' + await noW(p));
    await p.screenshot({ path: '/tmp/worth-today.png', fullPage: true });
    await expand(p, 'worth'); await p.click('[data-wtopen]'); await wait(300);
    ok(await p.textContent('#wtTotal') === '$8,500', 'net worth = assets - debts: ' + await p.textContent('#wtTotal'));
    ok(/\+\$1,500 since December 1/.test(await txt(p, '#wtChg')), 'change this month vs the last snapshot before it: ' + await txt(p, '#wtChg'));
    ok(/Assets \$12,500, debts -\$4,000/.test(await txt(p, '#wtChg')), 'assets and debts split');
    const pts = (await p.getAttribute('#wtChart polyline', 'points')).split(' ');
    ok(pts.length === 5 && await p.locator('#wtChart circle').count() === 3, `6-month line: prior value carried in, 3 snapshots, held to today (${pts.length} points, ${await p.locator('#wtChart circle').count()} dots)`);
    const lab = await p.textContent('#wtChart');
    ok(/Jul/.test(lab) && /Dec/.test(lab) && /high \$7,000/.test(lab) && /low \$3,000/.test(lab), 'month labels and range: ' + lab);
    ok(/Payouts owed to me|Prop payouts owed to me/.test(await txt(p, '#wtList')) && /not in hand yet/.test(await txt(p, '#wtList')) && /Debt \(what I owe\)/.test(await txt(p, '#wtList')), 'kinds listed');
    // emergency fund from the bills
    const ef = (8000 / monthly).toFixed(1);
    ok(new RegExp(ef.replace('.', '\\.') + ' months of expenses covered').test(await txt(p, '#wtEf')) && /average of your 4 bills/.test(await txt(p, '#wtEf')) && !(await p.locator('#wtExp').count()), 'emergency fund ' + ef + ' months from bills: ' + await txt(p, '#wtEf'));
    // savings goal
    const mo = Math.round(4000 / (182 / 30.4375)).toLocaleString('en-US');
    ok(new RegExp('Save \\$' + mo + ' a month').test(await txt(p, '#wtGoalOut')) && /\$4,000 still to go of \$10,000/.test(await txt(p, '#wtGoalOut')) && /about 6 months/.test(await txt(p, '#wtGoalOut')), 'required monthly saving $' + mo + ': ' + await txt(p, '#wtGoalOut'));
    ok(/your own numbers/i.test(await txt(p, '#wtDlg')) && /Nothing is pulled from a bank/.test(await txt(p, '#wtDlg')), 'labelled as your own numbers');
    ok((await noW(p)) <= 390, 'no sideways scroll ' + await noW(p));
    await p.screenshot({ path: '/tmp/worth.png', fullPage: false });
    // update a balance: savings 6000 -> 7000
    await p.fill('[data-wtid="a:2"] [data-wtbal]', '7000'); await p.press('[data-wtid="a:2"] [data-wtbal]', 'Tab'); await wait(300);
    ok(await p.textContent('#wtTotal') === '$9,500', 'total follows: ' + await p.textContent('#wtTotal'));
    ok(await snapOf(p, '2026-12-02') === 9500 && (await st(p)).worth.filter((x) => x.id.startsWith('s:')).length === 5, 'a dated snapshot is stored, one per day');
    ok(/\+\$2,500 since December 1/.test(await txt(p, '#wtChg')) && await p.locator('#wtChart circle').count() === 4, 'change and chart updated');
    ok(/\$3,000 still to go/.test(await txt(p, '#wtGoalOut')), 'goal progress follows savings: ' + await txt(p, '#wtGoalOut'));
    // a second update the same day replaces that day's snapshot
    await p.fill('[data-wtid="a:1"] [data-wtbal]', '2500'); await p.press('[data-wtid="a:1"] [data-wtbal]', 'Tab'); await wait(300);
    ok(await snapOf(p, '2026-12-02') === 10000 && (await st(p)).worth.filter((x) => x.id === 's:2026-12-02').length === 1, 'same-day update replaces the snapshot');
    // add a payout, remove the car loan (asks first)
    await p.fill('#wtName', 'Tradeify payout'); await p.selectOption('#wtKind', 'payout'); await p.fill('#wtNew', '500'); await p.click('#wtAdd'); await wait(300);
    ok(await p.textContent('#wtTotal') === '$10,500', 'payout counts as an asset: ' + await p.textContent('#wtTotal'));
    await p.click('[data-wtid="a:5"] [data-wtdel]'); await wait(300);
    ok(await p.isVisible('#askDlg'), 'removing asks first'); await p.click('#askNo'); await wait(200);
    ok(await p.locator('[data-wtid="a:5"]').count() === 1, 'cancel keeps it');
    await p.click('[data-wtid="a:5"] [data-wtdel]'); await wait(300); await p.click('#askYes'); await wait(400);
    ok(await p.locator('[data-wtid="a:5"]').count() === 0 && await p.textContent('#wtTotal') === '$14,500', 'debt removed: ' + await p.textContent('#wtTotal'));
    // goal edits
    await p.fill('#wtGoal', '12000'); await p.press('#wtGoal', 'Tab'); await wait(300);
    ok(/\$5,000 still to go of \$12,000/.test(await txt(p, '#wtGoalOut')), 'new goal: ' + await txt(p, '#wtGoalOut'));
    await p.fill('#wtGoalDate', '2026-11-01'); await p.press('#wtGoalDate', 'Tab'); await wait(300);
    ok(/target date has passed/.test(await txt(p, '#wtGoalOut')), 'past date handled: ' + await txt(p, '#wtGoalOut'));
    await p.click('#wtDlg [data-close]'); await wait(300);
    ok(/\$14,500/.test(await txt(p, '#wtCard')) && /months of bills saved/.test(await txt(p, '#wtCard')), 'Today card: ' + await txt(p, '#wtCard'));
    await p.reload(); await wait(800);
    ok(/\$14,500/.test(await txt(p, '#wtCard')), 'survives a reload');
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('WORTH OK');
})();
