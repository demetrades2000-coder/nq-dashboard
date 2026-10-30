// Shared helpers for the fooddb, nutgoals and nutweek tests: fixed New York clock, test hooks (window.__food), seeded state, mocked Open Food Facts.
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8791;
const URL = `http://127.0.0.1:${PORT}/nq-dashboard/planner/index.html`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NOW = Date.UTC(2026, 9, 28, 19, 0, 0); // Wed 2026-10-28 15:00 in New York
const TODAY = '2026-10-28';
function checker() {
  const errs = [];
  return { errs, ok: (c, m) => { if (!c) { errs.push(m); console.log('  FAIL ' + m); } else console.log('  ok   ' + m); }, done: (name) => { if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log(name + ' OK'); } };
}
// Opens the app. state = planner.v1 (first load only). init = extra script run before the page (string).
async function open(browser, { state, hash = '', width = 390, init, clock = true, perms = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, timezoneId: 'America/New_York', permissions: perms });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  if (clock) await p.clock.install({ time: NOW });
  await p.addInitScript(() => { window.PLANNER_TEST = true; });
  await p.addInitScript(([state]) => {
    try { if (localStorage.getItem('planner.seeded')) return; localStorage.setItem('planner.seeded', '1'); if (state) localStorage.setItem('planner.v1', JSON.stringify(state)); } catch (e) { /* none */ }
  }, [state || null]);
  if (init) await p.addInitScript(init);
  await p.goto(URL + hash); await wait(900);
  return { ctx, p, errs };
}
const st = (p) => p.evaluate(() => Object.assign({ meals: [], myfoods: [], foodcfg: [] }, JSON.parse(localStorage.getItem('planner.v1') || '{}')));
const meal = (date, kcal, p, c, f, extra = {}) => ({ id: 'm' + Math.random().toString(36).slice(2, 8), date, time: '12:00', slot: 'lunch', name: 'Meal', items: [], kcal, p, c, f, src: 'manual', note: '', created: 1, ...extra });
const NUTELLA = { status: 1, product: { code: '3017620422003', product_name: 'Hazelnut spread', brands: 'Acme,Other', serving_size: '15 g', serving_quantity: 15, nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, fiber_100g: 3 } } };
// Mock Open Food Facts. Returns counters so tests can check what was asked.
async function mockOff(ctx) {
  const hits = { product: 0, search: 0, urls: [] };
  await ctx.route('**/world.openfoodfacts.org/**', (r) => {
    const u = r.request().url(); hits.urls.push(u);
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (/\/api\/v2\/product\/3017620422003\.json/.test(u)) { hits.product++; return r.fulfill({ status: 200, headers: cors, body: JSON.stringify(NUTELLA) }); }
    if (/\/api\/v2\/product\/5000000000000\.json/.test(u)) { hits.product++; return r.fulfill({ status: 200, headers: cors, body: JSON.stringify({ status: 1, product: { code: '5000000000000', product_name: 'Kilojoule bar', nutriments: { energy_100g: 1674, proteins_100g: 5, carbohydrates_100g: 60, fat_100g: 10 } } }) }); }
    if (/\/api\/v2\/product\//.test(u)) { hits.product++; return r.fulfill({ status: 200, headers: cors, body: JSON.stringify({ status: 0, status_verbose: 'product not found' }) }); }
    if (/\/cgi\/search\.pl/.test(u)) {
      hits.search++;
      return r.fulfill({ status: 200, headers: cors, body: JSON.stringify({ products: [
        { code: '111', product_name: 'Zebra granola', brands: 'Stripe Co', nutriments: { 'energy-kcal_100g': 450, proteins_100g: 9, carbohydrates_100g: 65, fat_100g: 16 }, serving_size: '40 g', serving_quantity: '40' },
        { code: '222', product_name: 'Zebra crackers (kJ only)', nutriments: { energy_100g: 1255.2, proteins_100g: 8, carbohydrates_100g: 70, fat_100g: 12 } },
        { code: '333', product_name: 'Zebra mystery', nutriments: { proteins_100g: 1 } },
        { code: '444', product_name: '', nutriments: { 'energy-kcal_100g': 100 } },
        { code: '555', product_name: 'Zebra granola', brands: 'Stripe Co', nutriments: { 'energy-kcal_100g': 450 } },
      ] }) });
    }
    return r.fulfill({ status: 404, body: '{}' });
  });
  return hits;
}
module.exports = { chromium, PORT, URL, wait, NOW, TODAY, checker, open, st, meal, mockOff, NUTELLA };
