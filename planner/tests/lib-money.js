// Shared helpers for the bills, tilt and tradeplan tests (seed the cached dashboard data so no network is needed).
const PORT = process.env.PORT || 8781;
const URL = `http://127.0.0.1:${PORT}/nq-dashboard/planner/index.html`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// A cached dashboard copy: trades (closed live/paper), daily pnl, news events, bot daily limits.
function nqCache(now, o = {}) {
  return {
    t: now, pnl: o.pnl || {}, trades: o.trades || [],
    doc: {
      bot: 'NQ bots', tz: 'ET', kz: ['09:30-11:30', '13:30-15:30'], events: [],
      trade: { built: new Date(now).toISOString(), accounts: [], status: { running: true, host: '', t: 0, issues: [] }, month: null, day: o.day || '', plans: {}, bots: o.bots || {}, health: { level: '', text: '', bad: [] } },
      news: { built: new Date(now).toISOString(), events: o.news || [], headlines: [], earnings: [], srcBad: [] },
    },
  };
}
const trade = (day, entrySec, exitSec, usd, acct = 'lit') => ({ k: `${acct}:live:m:${entrySec}`, acct, src: 'live', mem: 'M', day, t0: entrySec, t1: exitSec, side: 'LONG', qty: 1, entry: 1, px: 1, exit: usd < 0 ? 'STOP' : 'TARGET', r: usd < 0 ? -1 : 1, usd });
// Opens the app in a New York browser with a fixed clock; seed = cached dashboard data, state = planner.v1 (both only on the first load).
async function open(browser, { now, seed, state, hash = '', width = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, timezoneId: 'America/New_York' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  if (now) await p.clock.install({ time: now });
  await p.addInitScript(([seed, state]) => {
    try {
      if (localStorage.getItem('planner.seeded')) return;
      localStorage.setItem('planner.seeded', '1');
      if (seed) localStorage.setItem('planner.nq', JSON.stringify(seed));
      if (state) localStorage.setItem('planner.v1', JSON.stringify(state));
    } catch (e) { /* none */ }
  }, [seed || null, state || null]);
  await p.goto(URL + hash); await wait(900);
  return { ctx, p, errs };
}
const st = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
module.exports = { PORT, URL, wait, nqCache, trade, open, st };
