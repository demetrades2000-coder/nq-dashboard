// Grounded AI: the model names foods and weighs them, the database supplies the numbers; corrections are learned.
// node planner/tests/meals3.test.js (PORT default 8777)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.clock.setFixedTime(new Date('2026-11-04T12:30:00'));
  const AI = { is_food: true, meal_name: 'Chicken and rice', confidence: 'medium', notes: 'Assumed grilled, no oil seen.', items: [
    { name: 'Grilled chicken breast', search: 'chicken breast grilled', portion: 'about 150 g', grams: 150, state: 'cooked', from_label: false, kcal: 300, protein_g: 30, carbs_g: 0, fat_g: 10 },
    { name: 'White rice', search: 'white rice cooked', portion: '1 cup', grams: 158, state: 'cooked', from_label: false, kcal: 260, protein_g: 5, carbs_g: 50, fat_g: 1 },
    { name: 'Protein bar', search: 'protein bar', portion: '1 bar', grams: 60, state: 'packaged', from_label: true, kcal: 210, protein_g: 20, carbs_g: 22, fat_g: 7 }] };
  let calls = 0;
  await p.route('https://api.anthropic.com/v1/messages', (route) => { calls++; route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(AI) }], stop_reason: 'end_turn' }) }); });
  await p.route(/api\.nal\.usda\.gov|openfoodfacts/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ foods: [], products: [] }) }));
  await p.addInitScript(() => { localStorage.setItem('planner.aikey', 'sk-ant-test'); });
  await p.goto(URL + '#today'); await wait(1500);
  const pick = (n) => p.evaluate(async (n) => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#c0841a'; x.fillRect(0, 0, 320, 240); const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)); const dt = new DataTransfer(); dt.items.add(new File([blob], n, { type: 'image/jpeg' })); const i = document.querySelector('#mlFile'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); }, n);
  await pick('a.jpg'); await p.waitForSelector('#mlSave', { timeout: 15000 });
  const rows = await p.$$eval('.ml-item', (els) => els.map((e) => ({ name: e.querySelector('[data-f=name]').value, kcal: +e.querySelector('[data-f=kcal]').value, p: +e.querySelector('[data-f=p]').value, src: e.querySelector('.ml-src').textContent, g: +e.querySelector('[data-f=grams]').value })));
  ok(rows.length === 3, 'three items ' + JSON.stringify(rows));
  ok(rows[0].kcal >= 235 && rows[0].kcal <= 262 && rows[0].p >= 43 && rows[0].p <= 50 && /Reference|USDA|Your food|Food database/.test(rows[0].src), 'chicken grounded in the database, not the AI guess 300: ' + JSON.stringify(rows[0]));
  ok(rows[1].kcal >= 195 && rows[1].kcal <= 215, 'rice grounded (about 205 for 1 cup): ' + JSON.stringify(rows[1]));
  ok(rows[2].kcal === 210 && /Label/.test(rows[2].src), 'a printed label keeps its own numbers: ' + JSON.stringify(rows[2]));
  ok(/Likely between/.test(await p.textContent('.ml-tot')), 'range shown');
  // weight edit scales the numbers
  await p.evaluate(() => { document.querySelectorAll('.ml-more').forEach((d) => { d.open = true; }); }); await p.fill('.ml-item[data-i="0"] [data-f="grams"]', '300'); await wait(100);
  const k2 = +(await p.inputValue('.ml-item[data-i="0"] [data-f="kcal"]')); ok(k2 >= 470 && k2 <= 525, 'doubling the weight doubles kcal ' + k2);
  await p.fill('.ml-item[data-i="0"] [data-f="grams"]', '150'); await wait(100);
  // the user corrects the chicken to their own number (their recipe is richer): it must be remembered
  await p.fill('.ml-item[data-i="0"] [data-f="kcal"]', '310'); await p.fill('.ml-item[data-i="0"] [data-f="p"]', '40'); await wait(100);
  ok(/You edited/.test(await p.textContent('.ml-item[data-i="0"] .ml-meta')), 'marked as edited');
  await p.click('#mlSave'); await wait(500);
  const my = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).myfoods);
  ok(my.some((x) => x.user && /chicken/i.test(x.name)), 'correction saved in My foods ' + JSON.stringify(my.map((x) => x.name)));
  const meal = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals[0]);
  ok(meal.items.length === 3 && meal.items[0].grams === 150 && meal.items[2].src === 'label' && meal.kcal > 600, 'meal saved with grams and sources ' + JSON.stringify(meal.items.map((i) => [i.name, i.kcal, i.src])));
  // next photo: the same food now comes from the user's own number
  await pick('b.jpg'); await p.waitForSelector('#mlSave', { timeout: 15000 });
  const r2 = await p.$eval('.ml-item[data-i="0"]', (e) => ({ kcal: +e.querySelector('[data-f=kcal]').value, src: e.querySelector('.ml-src').textContent }));
  ok(r2.kcal >= 295 && r2.kcal <= 325 && /Your food/.test(r2.src), 'second time uses your own number: ' + JSON.stringify(r2));
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('MEALS3 OK');
})();
