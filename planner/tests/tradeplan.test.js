// Trade plan + debrief: node planner/tests/tradeplan.test.js  (serve the site first, PORT env, default 8781; see shifts.test.js)
const { chromium } = require('playwright');
const { wait, nqCache, trade, open, st } = require('./lib-money');
const sec = (iso) => Math.round(Date.parse(iso) / 1000);
const DAY = '2026-11-03'; // a Tuesday; EST
const T = (a, b, usd) => trade(DAY, sec(`${DAY}T${a}:00Z`), sec(`${DAY}T${b}:00Z`), usd);
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const noW = (p) => p.evaluate(() => document.documentElement.scrollWidth);
  const news = [{ date: DAY, time: '08:30', impact: 'high', title: 'CPI y/y' }, { date: DAY, time: '10:00', impact: 'med', title: 'JOLTS Job Openings' }, { date: DAY, time: '11:00', impact: 'low', title: 'Minor thing' }, { date: '2026-11-04', time: '08:30', impact: 'high', title: 'Tomorrow only' }];

  // ---- before the open (8:00 ET): the plan card ----
  {
    const now = Date.parse(`${DAY}T13:00:00Z`);
    const { p, errs: pe } = await open(b, { now, seed: nqCache(now, { day: DAY, news }) });
    ok(await p.isVisible('#tpCard') && /Trade plan/.test(await p.textContent('#tpCard')), 'plan card before 12pm ET');
    ok(/NY open 9:30am ET, in 1h 30m/.test(await p.textContent('#tpCard')), 'NY open countdown: ' + (await p.textContent('#tpCard')).replace(/\s+/g, ' ').slice(0, 120));
    const nw = await p.textContent('#tpNews');
    ok(/8:30am/.test(nw) && /CPI/.test(nw) && /JOLTS/.test(nw) && !/Minor/.test(nw) && !/Tomorrow/.test(nw), 'only today medium/high news: ' + nw);
    await p.click('[data-tpbias="long"]'); await wait(200);
    ok(await p.getAttribute('[data-tpbias="long"]', 'aria-pressed') === 'true', 'bias button pressed');
    await p.fill('#tpSetup', 'Sweep of Asia low then reclaim'); await p.fill('#tpMax', '2'); await p.fill('#tpLevels', 'PDH 29,300 / PDL 28,900'); await p.press('#tpLevels', 'Tab'); await wait(1000);
    const s = await st(p), plan = s.tplan.find((x) => x.id === 'tp:' + DAY);
    ok(plan && plan.bias === 'long' && plan.setup === 'Sweep of Asia low then reclaim' && plan.max === 2 && /PDH/.test(plan.levels), 'plan saved keyed by date: ' + JSON.stringify(plan));
    await p.click('[data-tpbias="long"]'); await wait(200);
    ok((await st(p)).tplan.find((x) => x.id === 'tp:' + DAY).bias === '', 'tapping again clears the bias');
    await p.click('[data-tpbias="short"]'); await wait(200);
    ok((await noW(p)) <= 390, 'no sideways scroll');
    await p.screenshot({ path: '/tmp/tplan.png' });
    await p.reload(); await wait(700);
    ok(await p.inputValue('#tpSetup') === 'Sweep of Asia low then reclaim' && await p.getAttribute('[data-tpbias="short"]', 'aria-pressed') === 'true', 'plan survives a reload');
    await p.click('[data-tpmode="debrief"]'); await wait(200);
    ok(/Debrief/.test(await p.textContent('#tpCard')) && /No live\/paper|0 of 2|0/.test(await p.textContent('#tpCount')), 'tabs let me look at the debrief early');
    errs.push(...pe);
  }
  // ---- after 12pm ET: debrief with planned vs actual ----
  {
    const now = Date.parse(`${DAY}T17:30:00Z`); // 12:30 ET
    const prior = [['2026-10-30', 'yes'], ['2026-10-29', 'partly'], ['2026-10-28', 'no'], ['2026-10-02', 'yes']]; // the last one is more than 4 weeks old
    const state = { v: 1, view: 'today', tplan: [{ id: 'tp:' + DAY, date: DAY, bias: 'long', setup: 'Asia low sweep', max: 2, levels: '' }, ...prior.map(([d, f]) => ({ id: 'tp:' + d, date: d, followed: f }))] };
    const trades = [T('14:35', '14:45', -100), T('14:50', '15:00', 300), T('15:10', '15:20', 50)];
    const { p, errs: pe } = await open(b, { now, seed: nqCache(now, { day: DAY, trades, news }), state });
    const c = await p.textContent('#tpCard');
    ok(/Debrief/.test(c) && /Asia low sweep/.test(c) && /Long/.test(c) && /max 2 trades/.test(c), 'flips to debrief with the plan: ' + c.replace(/\s+/g, ' ').slice(0, 200));
    ok(/^3 of 2$/.test((await p.textContent('#tpCount')).trim()) && /more trade/.test(c), 'trades taken vs max, over flagged');
    ok(/\+\$250/.test(await p.textContent('#tpPnl')), 'live/paper P&L: ' + await p.textContent('#tpPnl'));
    ok(/Plan followed 50% over 4 weeks/.test(await p.textContent('#tpRate')) && /1 yes · 1 partly · 1 no/.test(c), 'rate over 4 weeks (partly = half): ' + await p.textContent('#tpRate'));
    await p.click('[data-tpfol="partly"]'); await wait(250);
    await p.fill('#tpLesson', 'Took a third trade out of boredom'); await p.press('#tpLesson', 'Tab'); await wait(1000);
    const plan = (await st(p)).tplan.find((x) => x.id === 'tp:' + DAY);
    ok(plan.followed === 'partly' && plan.lesson === 'Took a third trade out of boredom' && plan.bias === 'long', 'debrief saved on the same day item: ' + JSON.stringify(plan));
    ok(/Plan followed 5\d% over 4 weeks/.test(await p.textContent('#tpRate')) && /2 yes|1 yes · 2 partly/.test(await p.textContent('#tpCard')), 'rate updates: ' + (await p.textContent('#tpCard')).replace(/\s+/g, ' ').slice(-200));
    await p.click('#tpCard [data-tgo="review"]'); await wait(300);
    ok((await st(p)).view === 'review', 'link into Review');
    ok((await noW(p)) <= 390, 'no sideways scroll');
    errs.push(...pe);
  }
  // ---- Saturday: nothing planned, no card ----
  {
    const now = Date.parse('2026-11-07T15:00:00Z');
    const { p, errs: pe } = await open(b, { now, seed: nqCache(now, {}) });
    ok(!(await p.locator('#tpCard').count()), 'no card on a weekend without a plan');
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('TRADEPLAN OK');
})();
