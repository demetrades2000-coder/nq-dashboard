// Shared helpers for the fk-* tests (food knowledge engine): fixed New York clock and seeded state from lib-food.js, window.__fk hooks, a mocked USDA FoodData Central.
const lib = require('./lib-food');
// Evaluate fn(k, ...args) in the page where k = window.__fk (the food knowledge engine hooks). Args must be JSON.
const K = (p, fn, ...a) => p.evaluate(`(async()=>{const k=window.__fk;return (${fn.toString()})(k,...${JSON.stringify(a)})})()`);
const near = (a, b, tol = 0.051) => Math.abs(a - b) <= tol;
const nut = (id, v) => ({ nutrientId: id, value: v });
// USDA search hit in the real response shape (nutrient ids per FoodData Central).
const usdaFood = (fdcId, description, dataType, o) => ({ fdcId, description, dataType, foodNutrients: [
  ...(o.kcal != null ? [nut(1008, o.kcal)] : []), ...(o.k2047 != null ? [nut(2047, o.k2047)] : []), nut(1003, o.p), nut(1005, o.c), nut(1004, o.f),
  ...(o.fiber != null ? [nut(1079, o.fiber)] : []), ...(o.sugar != null ? [nut(2000, o.sugar)] : []), ...(o.na != null ? [nut(1093, o.na)] : []), ...(o.sat != null ? [nut(1258, o.sat)] : []) ] });
const CATALOG = [
  [/rutabaga/i, [usdaFood(11, 'Rutabagas, raw', 'SR Legacy', { kcal: 38, p: 1.08, c: 8.62, f: 0.16, fiber: 2.3, sugar: 4.46, na: 12, sat: 0.02 }), usdaFood(12, 'Rutabagas, cooked, boiled, drained, without salt', 'SR Legacy', { kcal: 35, p: 0.9, c: 8.1, f: 0.2, fiber: 2.2, sugar: 4.2, na: 15, sat: 0.02 })]],
  [/kohlrabi/i, [usdaFood(21, 'Kohlrabi, raw', 'Foundation', { k2047: 27, p: 1.7, c: 6.2, f: 0.1, fiber: 3.6, sugar: 2.6, na: 20, sat: 0 })]],
  [/bogus/i, [usdaFood(31, 'Bogus food, raw', 'SR Legacy', { kcal: 900, p: 0, c: 0, f: 0 })]],
  [/venison/i, [usdaFood(41, 'Game meat, deer, raw', 'SR Legacy', { kcal: 120, p: 22.9, c: 0, f: 2.4, sat: 1 })]],
];
// Mock USDA. Returns {hits, urls, mode} : mode.limit = true answers 429, mode.bad = true answers 403, mode.off = true aborts.
async function mockUsda(ctx) {
  const st = { hits: 0, urls: [], mode: { limit: false, bad: false, off: false, hang: false } };
  await ctx.route('**/api.nal.usda.gov/**', (r) => {
    const u = r.request().url(); st.hits++; st.urls.push(u);
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (st.mode.hang) return; // never answers
    if (st.mode.off) return r.abort();
    if (st.mode.limit) return r.fulfill({ status: 429, headers: cors, body: JSON.stringify({ error: { code: 'OVER_RATE_LIMIT', message: 'too many' } }) });
    if (st.mode.bad) return r.fulfill({ status: 403, headers: cors, body: JSON.stringify({ error: { code: 'API_KEY_INVALID', message: 'bad key' } }) });
    const q = new URL(u).searchParams.get('query') || '';
    const hit = CATALOG.find(([re]) => re.test(q));
    return r.fulfill({ status: 200, headers: cors, body: JSON.stringify({ totalHits: hit ? hit[1].length : 0, foods: hit ? hit[1] : [] }) });
  });
  return st;
}
module.exports = { ...lib, K, near, mockUsda, usdaFood };
