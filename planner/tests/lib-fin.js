// Shared helpers for the edge, score and worth tests. Like lib-money.js, but ../data.json is blocked so only the seeded
// trades exist (the real data.json would add its own live trades and make the numbers differ), and the time zone can be chosen.
process.env.PORT = process.env.PORT || '8783';
const { PORT, URL, wait, nqCache, trade, st } = require('./lib-money');
async function open(browser, { now, seed, state, hash = '', width = 390, tz = 'America/New_York' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, timezoneId: tz });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/data.json*', (r) => r.abort());
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
const sec = (iso) => Math.round(Date.parse(iso) / 1000);
// A closed trade on a New York trading day, entered at hh:mm ET (EST, UTC-5) and closed 5 minutes later.
const etTrade = (day, hm, usd, acct = 'lit') => { const t0 = sec(`${day}T${hm}:00Z`) + 5 * 3600; return trade(day, t0, t0 + 300, usd, acct); };
module.exports = { PORT, URL, wait, nqCache, trade, st, open, sec, etTrade };
