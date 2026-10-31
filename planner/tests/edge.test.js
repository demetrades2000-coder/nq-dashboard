// Edge finder: node planner/tests/edge.test.js  (serve the site first, PORT env, default 8783; see shifts.test.js)
const { chromium } = require('playwright');
const expand = require('./lib-expand');
const { wait, nqCache, open, st, etTrade } = require('./lib-fin');
const NOW = Date.parse('2026-12-02T15:10:00Z'); // Wednesday 10:10 ET (EST)
// Tuesdays: 2 losers a day (-150, -50). Mondays: +200 then -50. Wednesdays: +100 then -30 at 2pm. Two Thursdays: one +60 at 11:30.
const DATA = [];
for (const d of ['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24', '2026-12-01']) DATA.push(etTrade(d, '09:35', -150), etTrade(d, '10:15', -50));
for (const d of ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']) DATA.push(etTrade(d, '09:40', 200), etTrade(d, '10:20', -50));
for (const d of ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']) DATA.push(etTrade(d, '09:45', 100), etTrade(d, '14:10', -30));
for (const d of ['2026-11-05', '2026-11-12']) DATA.push(etTrade(d, '11:30', 60));
// the same numbers worked out by hand here, independent of the app
const ts = DATA.slice().sort((a, b) => a.t1 - b.t1), net = ts.reduce((s, t) => s + t.usd, 0);
let cum = 0, peak = 0, dd = 0; ts.forEach((t) => { cum += t.usd; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); });
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const noW = (p) => p.evaluate(() => document.documentElement.scrollWidth);
  const txt = async (p, sel) => (await expand.within(p, sel), await p.innerText(sel)).replace(/\s+/g, ' ');
  ok(DATA.length === 30 && net === 150, 'fixture sanity ' + DATA.length + ' ' + net);

  // ---- 1. no trades ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, {}) });
    ok(/Nothing to analyse/.test(await txt(p, '#edCard')), 'card with no trades: ' + await txt(p, '#edCard'));
    await expand(p, 'edge'); await p.click('[data-edopen]'); await wait(200);
    ok(await p.isVisible('#edDlg') && await p.isVisible('#edEmpty'), 'sheet shows the empty state');
    errs.push(...pe);
  }
  // ---- 2. three trades: not enough ----
  {
    const seed = nqCache(NOW, { trades: DATA.slice(0, 3) });
    const { p, errs: pe } = await open(b, { now: NOW, seed, hash: '#edge' });
    ok(await p.isVisible('#edDlg'), '#edge opens the sheet');
    ok(/Not enough trades yet \(3 of 5 needed\)/.test(await txt(p, '#edFind')) && !(await p.locator('#edFind li').count()), 'no findings below the minimum: ' + await txt(p, '#edFind'));
    errs.push(...pe);
  }
  // ---- 3. full set, no notes ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, { trades: DATA }) });
    ok(/\+?\$150/.test(await txt(p, '#edCard')) && /30 trades/.test(await txt(p, '#edCard')), 'card: ' + await txt(p, '#edCard'));
    ok((await noW(p)) <= 390, 'Today: no sideways scroll ' + await noW(p));
    await p.screenshot({ path: '/tmp/edge-today.png', fullPage: true });
    await expand(p, 'edge'); await p.click('[data-edopen]'); await wait(300);
    const s = await txt(p, '#edStats');
    ok(/\$150 net P&L/.test(s), 'net: ' + s);
    ok(/37% win rate \(11 W \/ 19 L\)/.test(s), 'win rate');
    ok(/\$138 average win/.test(s) && /-\$72\.11 average loss/.test(s), 'avg win / loss');
    ok(/\$5 expectancy per trade/.test(s) && /1\.11 profit factor/.test(s), 'expectancy and PF');
    ok(/\$150 best day \(Nov 2\)/.test(s) && /-\$200 worst day \(Nov 3\)/.test(s), 'best / worst day');
    ok(new RegExp('Max drawdown -\\$' + dd).test(await p.textContent('#edChart')) || (await p.textContent('#edChart')).includes('Max drawdown -$' + dd), 'drawdown marked on the curve: ' + dd + ' vs ' + await p.textContent('#edChart'));
    ok(await p.locator('#edChart polyline').count() === 1 && (await p.getAttribute('#edChart polyline', 'points')).split(' ').length === 31, 'equity curve has 31 points');
    const wd = await txt(p, '#edWd');
    ok(/Mon \$750/.test(wd) && /Tue -\$1,000/.test(wd) && /Wed \$280/.test(wd) && /Thu \$120/.test(wd), 'weekday sums: ' + wd);
    ok(await p.locator('#edWd .ed-r.few').count() === 1 && /Thu.*not enough trades yet/.test(await txt(p, '#edWd .ed-r.few')), 'Thursday (2 trades) dimmed as too few');
    const hr = await txt(p, '#edHr');
    ok(/9am ET \$650/.test(hr) && /10am ET -\$500/.test(hr) && /11am ET \$120/.test(hr) && /2pm ET -\$120/.test(hr), 'hour sums: ' + hr);
    const f = await p.locator('#edFind li').allTextContents();
    ok(f.length === 3, 'three findings: ' + f.length);
    ok(/Your Tuesdays lost \$1,000 over 5 days \(10 trades\): consider sitting out/.test(f[0]), 'finding 1: ' + f[0]);
    ok(/Entries around 10am ET lost \$500 over 10 trades on 10 days/.test(f[1]), 'finding 2: ' + f[1]);
    ok(/best weekday is Monday: \$750 over 5 days/.test(f[2]), 'finding 3: ' + f[2]);
    ok(await p.isVisible('#edNoTags'), 'hint to tag trades when there are no tags');
    ok(!(await p.locator('#edCmp').count()), 'no plan comparison without data');
    ok((await noW(p)) <= 390, 'no sideways scroll ' + await noW(p));
    await p.screenshot({ path: '/tmp/edge.png' });
    await p.click('#edDlg [data-close]'); ok(!(await p.isVisible('#edDlg')), 'closes');
    errs.push(...pe);
  }
  // ---- 4. tags, plan and rules ----
  {
    const mon = DATA.filter((t) => t.usd === 200); // 5 winners tagged Followed plan
    const tradenotes = mon.map((t) => ({ id: 'tn:' + t.k, tk: t.k, day: t.day, tags: ['Followed plan'], text: '', usd: t.usd }));
    const tplan = [['2026-11-02', 'yes'], ['2026-11-09', 'yes'], ['2026-11-16', 'yes'], ['2026-11-03', 'no'], ['2026-11-10', 'no'], ['2026-11-17', 'no']].map(([d, f]) => ({ id: 'tp:' + d, date: d, followed: f }));
    const journal = [['2026-11-04', 'yes'], ['2026-11-11', 'yes'], ['2026-11-18', 'yes'], ['2026-11-24', 'no'], ['2026-12-01', 'no'], ['2026-11-23', 'no']].map(([d, r]) => ({ id: 'j:' + d, date: d, note: '', mood: 0, rules: r }));
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, { trades: DATA }), state: { tradenotes, tplan, journal } });
    await expand(p, 'edge'); await p.click('[data-edopen]'); await wait(300);
    const f = await p.locator('#edFind li').allTextContents();
    ok(/Trades tagged Followed plan averaged \$200 vs -\$34\.00 without the tag \(5 vs 25 trades\)/.test(f[0]) || /averaged \$200 vs -\$34/.test(f[0]), 'tag finding first: ' + f[0]);
    ok(f.length === 3 && /Tuesdays/.test(f[1]), 'then the weekday: ' + f.join(' | '));
    ok(/By trade tag/.test(await txt(p, '#edDlg')) && /Followed plan \$1,000/.test(await txt(p, '#edTags')), 'tag table: ' + await txt(p, '#edTags'));
    const cmp = await txt(p, '#edCmp');
    ok(/trade plan \$150 \(3 d\) -\$200 \(3 d\)/.test(cmp), 'plan days compared: ' + cmp);
    ok(/journal rules \$70 \(3 d\)/.test(cmp), 'rules days compared: ' + cmp);
    ok((await noW(p)) <= 390, 'no sideways scroll');
    errs.push(...pe);
  }
  // ---- 5. Los Angeles: hour labels show local time too ----
  {
    const { p, errs: pe } = await open(b, { now: NOW, seed: nqCache(NOW, { trades: DATA }), tz: 'America/Los_Angeles', hash: '#edge' });
    const hr = await txt(p, '#edHr');
    ok(/9am ET \(6am local\)/.test(hr) && /2pm ET \(11am local\)/.test(hr), 'ET and local hour: ' + hr);
    errs.push(...pe);
  }
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('EDGE OK');
})();
