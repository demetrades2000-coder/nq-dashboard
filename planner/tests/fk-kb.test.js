// Food knowledge base (fkFind, fkGrams, fkScale): PORT=8793 node planner/tests/fk-kb.test.js  (serve the site first, see lib-food.js)
const { chromium, checker, open, K, near } = require('./lib-fk');
(async () => {
  const { ok, done } = checker();
  const b = await chromium.launch();
  const { ctx, p, errs } = await open(b);
  await ctx.route('**/*openfoodfacts.org/**', (r) => r.abort()); await ctx.route('**/api.nal.usda.gov/**', (r) => r.abort());

  // ---- the data itself
  const all = await K(p, (k) => k.fkAll().map((f) => ({ n: f.name, s: f.state, src: f.src, per: f.per100, typ: f.typ, por: f.portions, alc: f.alc || 0, id: f.id, al: f.al })));
  ok(all.length >= 450, 'built-in list has 450+ foods: ' + all.length);
  ok(all.every((f) => f.src === 'kb'), 'every food has src kb');
  ok(new Set(all.map((f) => f.id)).size === all.length, 'every food has a unique id');
  const NUM = ['kcal', 'p', 'c', 'f', 'fiber', 'sugar', 'na', 'sat'];
  const bad = all.filter((f) => !NUM.every((k) => Number.isFinite(f.per[k]) && f.per[k] >= 0));
  ok(!bad.length, 'all 8 numbers present and not negative for every food' + (bad.length ? ': ' + bad.map((f) => f.n) : ''));
  const flagged = await K(p, (k) => k.fkAll().map((f) => [f.name, f.state, k.fkSanity({ ...f.per100, alc: f.alc ? f.alc : 0 })]).filter((x) => x[2].length).map((x) => x[0] + ':' + x[2].join('/')));
  const allowed = ['Lemon', 'Lime', 'Cocoa powder']; // high-fiber foods where plain 4/4/9 overshoots the USDA kcal
  ok(flagged.every((s) => allowed.includes(s.split(':')[0])), 'every food passes the sanity check (except high-fiber ' + allowed + '): ' + flagged);
  ok(all.every((f) => f.per.p + f.per.c + f.per.f <= 100.5 && f.per.fiber <= f.per.c + 0.6 && f.per.sugar <= f.per.c + 0.6 && f.per.sat <= f.per.f + 0.6), 'macros <= 100 g per 100 g; fiber, sugar <= carbs; sat <= fat');
  const have = (n, s) => all.find((f) => f.n === n && (s === undefined || f.s === s));
  ok(have('Chicken breast', 'raw').per.kcal === 120 && have('Chicken breast', 'cooked').per.kcal === 165, 'chicken breast raw 120 vs cooked 165 kcal');
  ok(have('Rice white', 'raw').per.kcal === 365 && have('Rice white', 'cooked').per.kcal === 130, 'white rice raw 365 vs cooked 130');
  ok(have('Pasta', 'raw').per.kcal === 371 && have('Pasta', 'cooked').per.kcal === 158, 'pasta dry 371 vs cooked 158');
  ok(have('Ground beef 80 20', 'raw').per.kcal === 254 && have('Ground beef 93 7', 'raw').per.kcal === 152, 'ground beef 80/20 raw 254 vs 93/7 raw 152');
  ok(have('Ground beef 80 20', 'cooked') && have('Ground beef 93 7', 'cooked') && have('Ground beef 93 7', 'cooked').per.p > have('Ground beef 93 7', 'raw').per.p, 'ground beef cooked variants exist and are denser than raw');
  ok(have('Olive oil').per.kcal === 884 && have('Butter').per.kcal === 717 && have('Cheddar cheese').per.sat === 18.9, 'oils, butter and cheese carry the USDA numbers');
  ok(['Sirloin steak', 'Ribeye steak', 'Loaded baked potato', 'Caesar salad', 'Bread and butter', 'Blooming onion', 'Chicken wings'].every((n) => have(n)), 'steakhouse items exist: sirloin, ribeye, loaded baked potato, Caesar salad, bread and butter, fried onion, wings');
  ok(have('Loaded baked potato').typ && have('Caesar salad').typ && have('Bread and butter').typ && have('Blooming onion').typ && have('Ribeye steak', 'cooked').typ, 'restaurant and composite dishes are marked typ');
  ok(!have('Chicken breast', 'cooked').typ && !have('Egg', 'raw').typ && !have('Olive oil').typ && !have('Banana').typ, 'reference staples are not typ');
  ok(have('Beer').alc > 0 && have('Wine red').alc > 0 && have('Liquor 80 proof').alc > 20, 'alcohol carries grams of alcohol per 100 g');
  ok(have('Coffee') && have('Latte') && have('Cappuccino') && have('Frappuccino'), 'coffee drinks exist');
  ok(have('Egg', 'raw').por.large === 50 && have('Bread white').por.slice === 30 && have('Rice white', 'cooked').por.cup === 158 && have('Olive oil').por.tbsp === 13.5 && have('Banana').por.medium === 118 && have('Milk whole').por.cup === 244, 'portion table: large egg 50, slice bread 30, cup rice 158, tbsp olive oil 13.5, medium banana 118, cup milk 244');

  // ---- hand-checked numbers through fkScale
  const sc = (name, state, g) => K(p, (k, n, s, g) => { const f = k.fkAll().find((x) => x.name === n && x.state === s); return k.fkScale(f, g); }, name, state, g);
  let r = await sc('Chicken breast', 'cooked', 150);
  ok(r.kcal === 248 && near(r.p, 46.5) && r.c === 0 && near(r.f, 5.4), '150 g cooked chicken breast = 248 kcal, 46.5 g protein: ' + JSON.stringify(r));
  r = await sc('Rice white', 'cooked', 158);
  ok(r.kcal === 205 && near(r.c, 44.6), '1 cup cooked white rice (158 g) = 205 kcal: ' + r.kcal);
  r = await sc('Egg', 'raw', 100);
  ok(r.kcal === 143 && near(r.p, 12.6), '2 large eggs (100 g) = 143 kcal, 12.6 g protein: ' + JSON.stringify(r));
  r = await sc('Olive oil', '', 13.5);
  ok(r.kcal === 119 && r.f === 13.5, '1 tbsp olive oil = 119 kcal: ' + r.kcal);
  r = await sc('Chicken breast', 'raw', 150);
  ok(r.kcal === 180, '150 g raw chicken breast = 180 kcal: ' + r.kcal);
  r = await sc('Sirloin steak', 'cooked', 0);
  ok(r.kcal === 0 && r.p === 0 && r.na === 0, 'scaling 0 g gives zeros');
  const two = await K(p, (k) => { const f = k.fkAll().find((x) => x.name === 'Cheddar cheese'); return [k.fkScale(f, 28), k.fkScale(f, 56)]; });
  ok(two[1].kcal === 2 * two[0].kcal || Math.abs(two[1].kcal - 2 * two[0].kcal) <= 1, 'scaling is linear: 56 g is twice 28 g');
  ok(two[0].kcal === 113 && two[0].na === 183 && near(two[0].sat, 5.3), '1 oz cheddar: 113 kcal, 183 mg sodium, 5.3 g sat: ' + JSON.stringify(two[0]));
  const bare = await K(p, (k) => k.fkScale({ kcal: 200, p: 10, c: 20, f: 8 }, 50));
  ok(bare.kcal === 100 && bare.p === 5 && bare.c === 10 && bare.f === 4 && bare.fiber === undefined, 'a bare per-100 object scales too; unknown optional fields stay absent: ' + JSON.stringify(bare));

  // ---- fkFind: ranking, states, aliases, plurals, typos
  const top = (q) => K(p, (k, q) => { const h = k.fkFind(q, 5); return h.length ? { label: k.fkLabel(h[0].food), score: h[0].score, n: h.length, next: h[1] ? k.fkLabel(h[1].food) : '' } : null; }, q);
  const cases = [
    ['chicken breast', 'Chicken breast, cooked'], ['grilled chicken breast', 'Chicken breast, cooked'], ['raw chicken breast', 'Chicken breast, raw'], ['fried chicken breast', 'Chicken breast, fried'],
    ['baked chicken', 'Chicken breast, cooked'], ['chicken', 'Chicken breast, cooked'], ['uncooked rice', 'Rice white, raw'], ['rice', 'Rice white, cooked'], ['boiled rice', 'Rice white, cooked'],
    ['dry pasta', 'Pasta, raw'], ['spaghetti', 'Pasta, cooked'], ['cooked spaghetti', 'Pasta, cooked'], ['ground beef 80/20', 'Ground beef 80 20, raw'], ['cooked ground beef 93/7', 'Ground beef 93 7, cooked'],
    ['93/7 ground beef raw', 'Ground beef 93 7, raw'], ['eggs', 'Egg, raw'], ['fried egg', 'Egg, fried'], ['hard boiled egg', 'Egg, cooked'], ['scrambled eggs', 'Scrambled egg'],
    ['olive oil', 'Olive oil'], ['evoo', 'Olive oil'], ['bananas', 'Banana'], ['sweet potatoes', 'Sweet potato, cooked'], ['tomatoes', 'Tomato'], ['sub sandwich', 'Subway sandwich'],
    ['fried chicken', 'Chicken pieces'], ['wings', 'Chicken wings, fried'], ['buffalo wings', 'Buffalo wings'], ['ribeye', 'Ribeye steak, cooked'], ['sirloin steak', 'Sirloin steak, cooked'],
    ['loaded baked potato', 'Loaded baked potato'], ['baked potato', 'Potato baked'], ['caesar salad', 'Caesar salad'], ['bread and butter', 'Bread and butter'], ['fried onion', 'Blooming onion'],
    ['greek yogurt', 'Yogurt greek nonfat'], ['2% milk', 'Milk 2%'], ['skim milk', 'Milk skim'], ['oatmeal', 'Oatmeal'], ['whey protein', 'Whey protein powder'], ['coke', 'Cola'], ['red wine', 'Wine red'],
    ['latte', 'Latte'], ['cappuccino', 'Cappuccino'], ['french fries', 'French fries'], ['cheeseburger', 'Cheeseburger'], ['pepperoni pizza', 'Pizza pepperoni'], ['canned tuna', 'Tuna canned in water'],
    ['salmon', 'Salmon, cooked'], ['raw salmon', 'Salmon, raw'], ['avocado', 'Avocado'], ['peanut butter', 'Peanut butter'],
  ];
  const wrong = [];
  for (const [q, want] of cases) { const t = await top(q); if (!t || t.label !== want) wrong.push(`${q} -> ${t && t.label} (wanted ${want})`); }
  ok(!wrong.length, `${cases.length} queries pick the right food and raw/cooked/fried variant` + (wrong.length ? ': ' + wrong.join(' | ') : ''));
  const typo = ['chiken breast', 'brocoli', 'spagetti', 'avacado', 'mozzarela', 'cheddr cheese', 'bananna', 'brocolli'];
  const typoWant = ['Chicken breast, cooked', 'Broccoli, cooked', 'Pasta, cooked', 'Avocado', 'Mozzarella part skim', 'Cheddar cheese', 'Banana', 'Broccoli, cooked'];
  const tw = []; for (let i = 0; i < typo.length; i++) { const t = await top(typo[i]); if (!t || t.label !== typoWant[i]) tw.push(`${typo[i]} -> ${t && t.label}`); }
  ok(!tw.length, 'typos are tolerated' + (tw.length ? ': ' + tw : ''));
  const pre = await top('chick brea'); ok(pre && pre.label === 'Chicken breast, cooked', 'typed prefixes match: "chick brea": ' + (pre && pre.label));
  const wo = await K(p, (k) => ({ raw: k.fkFind('raw chicken breast', 3).map((h) => h.score), grilled: k.fkFind('grilled chicken breast', 3).map((h) => h.score) }));
  ok(wo.raw[0] > wo.raw[1] + 20 && wo.grilled[0] > wo.grilled[1] + 20, 'the asked-for variant beats the others by a clear margin: ' + JSON.stringify(wo));
  const g1 = await top('zxqv blorp'); ok(g1 === null, 'nonsense matches nothing');
  const g2 = await K(p, (k) => [k.fkFind('', 5).length, k.fkFind('   ', 5).length, k.fkFind(null, 5).length, k.fkFind('chicken', 2).length]);
  ok(g2[0] === 0 && g2[1] === 0 && g2[2] === 0 && g2[3] === 2, 'empty queries -> [], limit is respected: ' + g2);
  const strong = await top('2 large eggs'); ok(strong && strong.label === 'Egg, raw' && strong.score >= 70, 'amounts in the query are ignored ("2 large eggs"): ' + JSON.stringify(strong));
  const strong2 = await top('150 g cooked chicken breast'); ok(strong2 && strong2.label === 'Chicken breast, cooked' && strong2.score >= 100, 'amount and unit are ignored ("150 g cooked chicken breast")');
  const weak = await top('salmon sashimi bowl with mango'); ok(!weak || weak.score < 70, 'a vague dish is not a strong match: ' + JSON.stringify(weak));

  // ---- fkGrams: portion text -> grams
  const G = (text, name, state) => K(p, (k, t, n, s) => { const f = n ? k.fkAll().find((x) => x.name === n && (s == null || x.state === s)) : undefined; return k.fkGrams(t, f); }, text, name || '', state);
  const phr = [
    ['1 cup', 'Rice white', 'cooked', 158], ['2 slices', 'Bread white', undefined, 60], ['about 150 g', 'Chicken breast', 'cooked', 150], ['1/2 cup', 'Rice white', 'cooked', 79], ['3 oz', 'Chicken breast', 'cooked', 85.1],
    ['1 medium', 'Banana', undefined, 118], ['2 large eggs', 'Egg', 'raw', 100], ['1 tbsp', 'Olive oil', undefined, 13.5], ['1 tsp', 'Olive oil', undefined, 4.5], ['150g', 'Rice white', 'cooked', 150],
    ['1.5 cups', 'Rice white', 'cooked', 237], ['1 1/2 cups', 'Rice white', 'cooked', 237], ['two slices of bread', 'Bread white', undefined, 60], ['a medium banana', 'Banana', undefined, 118], ['half an avocado', 'Avocado', undefined, 100.5],
    ['6 oz', 'Sirloin steak', 'cooked', 170.1], ['1 lb', 'Ground beef 80 20', 'raw', 453.6], ['250 ml', 'Milk whole', undefined, 244 * 250 / 240], ['1 cup milk', 'Milk whole', undefined, 244], ['8 fl oz', 'Milk whole', undefined, 244],
    ['1 medium (118 g)', 'Banana', undefined, 118], ['2 slices (60 g)', 'Bread white', undefined, 60], ['3 strips', 'Bacon', 'cooked', 24], ['1 can', 'Tuna canned in water', undefined, 142], ['1 scoop', 'Whey protein powder', undefined, 30],
    ['2 tbsp', 'Peanut butter', undefined, 32], ['1 serving', 'Yogurt greek nonfat', undefined, 170], ['1 egg', 'Egg', 'raw', 50], ['a handful', 'Almonds', undefined, 28], ['1 stick', 'Butter', undefined, 113],
    ['1/4 cup', 'Rice white', 'cooked', 39.5], ['½ cup', 'Rice white', 'cooked', 79], ['1 large', 'Egg', 'raw', 50], ['3 medium bananas', 'Banana', undefined, 354], ['100 grams', 'Oats', undefined, 100], ['1 kg', undefined, undefined, 1000],
  ];
  const pw = [];
  for (const [t, n, s, want] of phr) { const g = await G(t, n, s); const okv = want === null ? g !== null : g != null && Math.abs(g - want) <= 0.6; if (!okv) pw.push(`${t}|${n} -> ${g} (wanted ${want})`); }
  ok(!pw.length, `${phr.length} portion phrasings parse` + (pw.length ? ': ' + pw.join(' | ') : ''));
  const gj = await K(p, (k) => [k.fkGrams('', undefined), k.fkGrams('banana peel', undefined), k.fkGrams('some', undefined), k.fkGrams('0 g', undefined), k.fkGrams('1 bowl', k.fkAll().find((f) => f.name === 'Banana')), k.fkGrams(null, undefined)]);
  ok(gj.every((x) => x === null), 'unparseable text -> null: ' + gj);
  const gi = await K(p, (k) => ({ exact: k.fkGramsInfo('1 cup', k.fkAll().find((f) => f.name === 'Rice white' && f.state === 'cooked')), derived: k.fkGramsInfo('2 tbsp', k.fkAll().find((f) => f.name === 'Rice white' && f.state === 'cooked')), generic: k.fkGramsInfo('1 cup', k.fkAll().find((f) => f.name === 'Banana' && false) || k.fkAll().find((f) => f.name === 'Kimchi' && false)), gen2: k.fkGramsInfo('1 cup', undefined), oz: k.fkGramsInfo('4 oz', undefined) }));
  ok(gi.exact.via === 'portion' && !gi.exact.approx && gi.derived.via === 'derived' && near(gi.derived.grams, 19.8, 0.1) && gi.gen2.approx && gi.oz.grams === 113.4, 'sources are labelled: portion table, derived from cup, generic estimate is approx: ' + JSON.stringify([gi.exact, gi.derived, gi.gen2, gi.oz]));

  ok(!errs.length, 'no page errors ' + errs);
  done('fk-kb');
  await b.close();
})();
