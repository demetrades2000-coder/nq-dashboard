// Trades view (cache of live/paper trades from data.json, notes, tag summary), payout planner, risk alerts.
// Run: node planner/tests/trades.test.js
// Serves the repo root on a local port so ../data.json resolves exactly as it does on the dashboard site.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { SIZES, SHOTS } = require('./lib');
let failures = 0;
function ok(c, m) { if (c) console.log('  ok   ' + m); else { failures++; console.log('  FAIL ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const noH = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function more(page, v) {
  if (await page.locator(`#views > [data-v="${v}"]`).isVisible()) await page.click(`#views > [data-v="${v}"]`);
  else { await page.click('#moreBtn'); await page.click(`#moreMenu [data-v="${v}"]`); }
  await page.waitForTimeout(80);
}
const nq = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('planner.nq')));
const st = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/planner/index.html`;
  const browser = await chromium.launch();
  try {
    // ---------- real dashboard data ----------
    for (const size of ['phone', 'desktop']) {
      console.log(' ' + size + ' (real data.json)');
      const ctx = await browser.newContext({ viewport: SIZES[size], hasTouch: size === 'phone', isMobile: size === 'phone' });
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text()); });
      await page.goto(base);
      await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('planner.nq')).trades; } catch (e) { return false; } }, null, { timeout: 15000 });
      const c = await nq(page), raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
      const closed = raw.board.trades.filter((t) => !t.open);
      eq(c.trades.length, closed.length, 'cache holds every closed live/paper trade from board.trades (not the backtest history)');
      ok(c.trades.every((t) => t.k && t.acct && typeof t.usd === 'number'), 'cached trades have key, account, usd');
      eq(new Set(c.trades.map((t) => t.k)).size, c.trades.length, 'trade keys are unique (live and paper twins stay separate)');
      ok(JSON.stringify(c).length < 200000, 'cache stays small (' + JSON.stringify(c).length + ' bytes)');
      ok(c.doc.trade.plans && c.doc.trade.plans.builder50k && c.doc.trade.plans.builder50k.split === raw.funded_life.rules.builder50k.split, 'plan rules cached');
      ok(c.doc.trade.bots && c.doc.trade.bots.lit && c.doc.trade.bots.lit.dll === raw.board.lit.dll, 'daily limit cached');

      await more(page, 'trades');
      await page.waitForSelector('.tr-row');
      eq(await page.locator('.tr-row').count(), closed.length, 'every trade is listed');
      const first = await page.locator('.tr-row').first().textContent();
      ok(/Zlarior|ATLAS/.test(first) && /R/.test(first) && /\$/.test(first), 'row shows account, R and $: ' + first.replace(/\s+/g, ' ').slice(0, 80));
      ok(await noH(page), 'trades view: no horizontal scroll');
      await page.screenshot({ path: `${SHOTS}/trades-${size}.png` });

      // note a trade: rating, tags, text
      await page.locator('.tr-row').first().click();
      ok(await page.isVisible('#trDlg'), 'trade sheet opens');
      await page.click('#trRate [data-trr="4"]');
      await page.click('#trTags [data-trt="Followed plan"]');
      await page.click('#trTags [data-trt="Good patience"]');
      await page.fill('#trText', 'Waited for the sweep');
      await page.click('#trForm button[type=submit]');
      await page.waitForTimeout(100);
      await page.locator('.tr-row').nth(1).click();
      await page.click('#trTags [data-trt="FOMO"]');
      await page.click('#trForm button[type=submit]');
      await page.waitForTimeout(100);
      let s = await st(page);
      eq(s.tradenotes.length, 2, 'two notes saved');
      const n = s.tradenotes.find((x) => x.rating === 4);
      ok(n && n.id === 'tn:' + c.trades[0].k && n.tk === c.trades[0].k, 'note keyed by the trade key');
      eq(n.tags, ['Followed plan', 'Good patience'], 'tags saved');
      eq(n.text, 'Waited for the sweep', 'text saved');
      ok(n.u > 0, 'note has a sync timestamp');
      const sum = await page.textContent('main');
      ok(/50%/.test(sum) && /tagged Followed plan/.test(sum), '% Followed plan shows (1 of 2 reviewed)');
      ok(/Average R/.test(sum) && /FOMO/.test(sum), 'average R by tag table shows');
      ok(await page.locator('.tr-row .tr-star').count() === 1, 'rating shows on the row');
      await page.screenshot({ path: `${SHOTS}/trades-noted-${size}.png`, fullPage: false });

      // filters
      await page.click('[data-trsrc="paper"]');
      ok((await page.locator('.tr-row').count()) === closed.filter((t) => t.src === 'paper').length, 'paper filter works');
      await page.click('[data-trsrc="all"]');

      // payout planner
      ok(/Path to payout/.test(sum), 'payout card is on the Trades view');
      ok(/Enter an average winning-day profit/.test(await page.textContent('#poOut')), 'estimate asks for input first (no invented numbers)');
      await page.fill('#poAvg', '500');
      await page.fill('#poDays', '2');
      const out = await page.textContent('#poOut');
      const lit = raw.goals.accounts.find((a) => a.strategy === 'LIT'), nd = Math.ceil(lit.to_go / 500), wk = Math.ceil(nd / 2);
      ok(out.includes(`${nd} winning day`) && out.includes(`about ${wk} week`), `LIT estimate = ${nd} winning days, ${wk} weeks: ${out.replace(/\s+/g, ' ').slice(0, 120)}`);
      ok(/not a prediction|assumes no losing days/.test(await page.textContent('#poCard')), 'labelled as an estimate');
      const tbl = await page.textContent('#poCard');
      const r50 = raw.funded_life.rules.builder50k;
      ok(tbl.includes('$' + Math.round(r50.pay_max * r50.split).toLocaleString('en-US')), 'payout table shows max payout after the split');
      ok(await noH(page), 'payout card: no horizontal scroll');
      await page.screenshot({ path: `${SHOTS}/payout-${size}.png`, fullPage: false });

      // persistence
      await page.reload();
      await more(page, 'trades');
      s = await st(page);
      eq(s.tradenotes.length, 2, 'notes persist after reload');
      eq(await page.inputValue('#poAvg'), '500', 'what-if input remembered');
      ok((await page.locator('.tr-row .tr-tag').count()) === 3, 'tags shown on rows after reload');

      // clear a note
      await page.locator('.tr-row').first().click();
      await page.click('#trClear'); await page.click('#askYes');
      await page.waitForTimeout(300);
      eq((await st(page)).tradenotes.length, 1, 'note cleared');

      // trading card + alerts on the Today view
      await more(page, 'month');
      const card = await page.textContent('#trade');
      ok(/Trading/.test(card), 'trading card still renders');
      eq(errors, [], 'no page errors');
      await ctx.close();
    }

    // ---------- risk alerts from a seeded cache (fresh and stale) ----------
    const fresh = (over = {}) => ({
      t: Date.now(),
      doc: { bot: 'NQ bots', tz: 'ET', kz: [], events: [], news: { events: [], headlines: [], earnings: [], srcBad: [] }, trade: Object.assign({
        built: new Date().toISOString(), day: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), plans: {},
        accounts: [
          { name: 'MFFU Builder 50K', strategy: 'LIT', stage: 'eval', status: 'open', profit: -1254, target: 3000, to_go: 4254, room: 577, room_frac: 0.2, sessions_left: 3 },
          { name: 'MFFU Builder 25K', strategy: 'ATLAS', stage: 'eval', status: 'open', profit: 525, target: 1500, to_go: 975, room: 600, room_frac: 0.4, sessions_left: 8 },
        ],
        status: { running: true, host: 'PC', t: 1, issues: [] }, bots: { lit: { dll: 1000, used: 800, today: -800 }, atlas: { dll: 600, used: 0, today: 0 } }, health: { level: 'ok', text: '', bad: [] },
      }, over) },
      pnl: {}, trades: [],
    });
    for (const size of ['phone', 'desktop']) {
      console.log(' ' + size + ' (risk alerts)');
      const ctx = await browser.newContext({ viewport: SIZES[size], hasTouch: size === 'phone', isMobile: size === 'phone' });
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      const seed = (o) => page.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('planner.nq', JSON.stringify(v)); sessionStorage.setItem('seeded', '1'); } }, o);
      await seed(fresh());
      await page.goto(base);
      await page.waitForSelector('#trade .ral');
      let t = await page.textContent('#trade');
      ok(/Zlarior: \$577 of room left above the loss floor \(20%\)/.test(t), 'red room alert under 25%');
      ok(/ATLAS: \$600 of room left above the loss floor \(40%\)/.test(t), 'amber room alert under 45%');
      ok(/Zlarior: 80% of today's loss limit used/.test(t), 'daily loss limit over 70% alerts');
      ok(!/ATLAS: \d+% of today/.test(t), 'no limit alert at 0%');
      ok(await page.locator('#trade .ral.red').count() >= 1 && await page.locator('#trade .ral.amber').count() >= 2, 'red and amber styling');
      ok(!/data \d+ (h|min|days) old/.test(t) && !/Dashboard data is/.test(t), 'fresh data is not called stale');
      ok(await noH(page), 'alerts: no horizontal scroll');
      await page.screenshot({ path: `${SHOTS}/alerts-${size}.png`, fullPage: false });
      if (size === 'phone') {
        await page.click('#views [data-v=month]'); await page.waitForTimeout(300); // the Today screen shows alerts in its own banner
        const nb = await page.textContent('#nowbar');
        ok(/of room left above the loss floor/.test(nb) && /more\)/.test(nb), 'Now bar carries the top alert and a count: ' + nb.replace(/\s+/g, ' ').slice(0, 140));
      }
      await ctx.close();

      // bot not running + stale data
      const ctx2 = await browser.newContext({ viewport: SIZES[size] });
      const p2 = await ctx2.newPage();
      const old = fresh({ built: new Date(Date.now() - 7 * 3600e3).toISOString(), status: { running: false, host: 'PC', t: 1, issues: [] } });
      await p2.addInitScript((v) => { localStorage.setItem('planner.nq', JSON.stringify(v)); }, old);
      await p2.goto(base);
      await p2.waitForSelector('#trade .ral');
      t = await p2.textContent('#trade');
      ok(/Dashboard data is 7 h old/.test(t), 'stale data says it is stale');
      ok(/\(data 7 h old\)/.test(t), 'room alerts carry the data age');
      ok(!/loss limit used/.test(t), 'daily limit is not claimed from stale data');
      await ctx2.close();

      const ctx3 = await browser.newContext({ viewport: SIZES[size] });
      const p3 = await ctx3.newPage();
      await p3.addInitScript((v) => { localStorage.setItem('planner.nq', JSON.stringify(v)); }, fresh({ status: { running: false, host: 'DESK', t: 1, issues: [{ text: 'NinjaTrader disconnected', fix: 'Restart it' }] } }));
      await p3.goto(base);
      await p3.waitForSelector('#trade .tstat');
      t = await p3.textContent('#trade');
      ok(/Bot not running/.test(t), 'bot not running shown');
      ok(/Bot issue: NinjaTrader disconnected/.test(t), 'bot issue alert shown');
      await ctx3.close();
    }
  } finally {
    await browser.close(); server.close();
  }
  console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
})().then(() => { process.exit(failures ? 1 : 0); }).catch((e) => { console.log('  FAIL threw: ' + (e && e.stack || e)); process.exit(1); });
