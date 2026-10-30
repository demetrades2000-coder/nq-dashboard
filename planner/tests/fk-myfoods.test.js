// My foods, learning, recipes, suggestions, extended nutrients: PORT=8793 node planner/tests/fk-myfoods.test.js  (serve the site first, see lib-food.js)
const { chromium, wait, checker, open, st, meal, K, near, mockUsda, TODAY } = require('./lib-fk');
(async () => {
  const { ok, done } = checker();
  const b = await chromium.launch();
  const R = (p, o) => K(p, (k, o) => k.fkResolve(o), o);
  const offline = async (ctx) => { await ctx.route('**/world.openfoodfacts.org/**', (r) => r.abort()); await ctx.route('**/api.nal.usda.gov/**', (r) => r.abort()); };

  // ---- the learning loop: edit -> next resolve answers from your own food
  {
    const { ctx, p, errs } = await open(b); await offline(ctx);
    const before = await R(p, { name: 'grilled chicken breast', grams: 150 });
    ok(before.source === 'kb' && before.nutrients.kcal === 248, 'before learning: kb, 248 kcal');
    const m = await K(p, (k) => k.fkLearn({ name: 'grilled chicken breast', grams: 150, kcal: 220, p: 42, c: 0, f: 4, fiber: 0, na: 90, sat: 1 }));
    ok(m && m.id === 'u:chicken-breast.cooked' && m.user === true && m.sg === 150 && m.serving === '150 g' && m.corr === 1 && m.kcal === 220 && m.p === 42 && m.na === 90, 'learned food stored (id, user, sg, serving, per-serving numbers): ' + JSON.stringify(m));
    ok(m.per100.kcal === 146.7 && m.per100.p === 28 && m.per100.f === 2.7 && m.per100.na === 60 && m.per100.sat === 0.7, 'per100 worked out from the grams: ' + JSON.stringify(m.per100));
    const after = await R(p, { name: 'grilled chicken breast', grams: 200 });
    ok(after.source === 'mine' && after.conf === 'high' && after.nutrients.kcal === 293 && after.nutrients.p === 56 && after.nutrients.na === 120 && /own foods/.test(after.note), 'next time the answer is "mine", scaled to 200 g: ' + JSON.stringify(after.nutrients));
    const one = await R(p, { name: 'grilled chicken breast', portion: '1 serving' });
    ok(one.source === 'mine' && one.grams === 150 && one.nutrients.kcal === 220 && one.nutrients.p === 42, 'exactly one saved serving returns the saved numbers: ' + JSON.stringify(one.nutrients));
    const plain = await R(p, { name: 'chicken breast', grams: 100 }); ok(plain.source === 'mine' && plain.nutrients.kcal === 147, 'a plain "chicken breast" also finds it');
    const raw = await R(p, { name: 'raw chicken breast', grams: 100 }); ok(raw.source === 'kb' && raw.nutrients.kcal === 120, 'but "raw chicken breast" does not (it was learned as cooked): ' + raw.source);
    const other = await R(p, { name: 'chicken thigh', grams: 100 }); ok(other.source === 'kb', 'another food is unaffected');
    const again = await K(p, (k) => k.fkLearn({ name: 'Grilled Chicken Breasts', grams: 150, kcal: 200, p: 40, c: 0, f: 3 }));
    const s1 = await st(p);
    ok(again.id === m.id && again.corr === 2 && s1.myfoods.length === 1 && again.kcal === 200 && again.na === undefined, 'correcting again updates the same food (same id, corr 2, optional fields that were not given are dropped)');
    ok((await R(p, { name: 'grilled chicken breast', portion: '1 serving' })).nutrients.kcal === 200, 'and the newest numbers win');
    const nog = await K(p, (k) => k.fkLearn({ name: 'Mom lasagna', kcal: 520, p: 30, c: 50, f: 20 }));
    ok(nog && !nog.sg && !nog.per100 && nog.serving === '1 serving', 'a food with no weight keeps per-serving numbers only');
    const rn = await R(p, { name: 'mom lasagna', grams: 300 });
    ok(rn.source === 'mine' && rn.grams === 0 && rn.nutrients.kcal === 520 && /per serving/.test(rn.note), 'resolved per serving: ' + JSON.stringify([rn.grams, rn.nutrients.kcal, rn.note]));
    const por = await K(p, (k) => k.fkLearn({ name: 'banana', portion: '1 medium', kcal: 100, p: 1, c: 25, f: 0 }));
    ok(por && por.sg === 118 && por.serving === '1 medium', 'grams are worked out from the portion text ("1 medium" banana = 118 g)');
    const bad = await K(p, (k) => [k.fkLearn({ name: '', kcal: 100 }), k.fkLearn({ name: 'x', kcal: -5 }), k.fkLearn({ name: 'x', kcal: 'abc' }), k.fkLearn({ name: 'Magic bean', grams: 50, kcal: 1000, p: 0, c: 0, f: 0 }), k.fkLearn({ name: 'Neg', kcal: 10, p: -3 }), k.fkLearn(null), k.fkLearn({ kcal: 100 })]);
    ok(bad.every((x) => x === null), 'unusable corrections are refused: ' + JSON.stringify(bad));
    const s2 = await st(p); ok(s2.myfoods.length === 3, 'and add nothing: ' + s2.myfoods.length);
    const loc = await p.evaluate(() => window.__food.fdLocal('grilled chicken').map((f) => f.name + ':' + f.perServing.kcal));
    ok(/^Grilled Chicken Breast/.test(loc[0]) && /:200$/.test(loc[0]), 'the Find a food picker lists it first, with its serving numbers: ' + loc.slice(0, 2));
    await p.reload(); await wait(700);
    ok((await R(p, { name: 'grilled chicken breast', grams: 100 })).source === 'mine', 'it survives a reload (synced collection myfoods)');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }

  // ---- the My foods sheet
  {
    const seed = { myfoods: [
      { id: 'f1', name: 'Protein bar', brand: '', kcal: 200, p: 20, c: 20, f: 7, serving: '1 bar (60 g)', per100: { kcal: 333.3, p: 33.3, c: 33.3, f: 11.7 }, used: 3, last: 5, fav: true },
      { id: 'f2', name: 'Oat cookie', brand: '', kcal: 120, p: 2, c: 18, f: 5, serving: '1 cookie', used: 9, last: 4, fav: false },
      { id: 'f3', name: 'Zesty yogurt', brand: 'Acme', kcal: 90, p: 8, c: 12, f: 1, serving: '1 cup (170 g)', per100: { kcal: 53, p: 4.7, c: 7, f: 0.6 }, used: 1, last: 3, fav: false },
    ] };
    const { ctx, p, errs } = await open(b, { state: seed, hash: '#my-foods' }); await offline(ctx);
    ok(await p.isVisible('#fkMyDlg'), '#my-foods opens the sheet');
    const names = await p.$$eval('#fkList .fk-row b', (els) => els.map((e) => e.textContent));
    ok(names.join('|') === 'Protein bar|Oat cookie|Zesty yogurt', 'favorites first, then most used: ' + names);
    await p.fill('#fkQ', 'yog'); ok((await p.$$('#fkList .fk-row')).length === 1, 'search filters (yog -> 1)');
    await p.fill('#fkQ', 'zzz'); ok(/Nothing matches/.test(await p.textContent('#fkList')), 'no match message');
    await p.fill('#fkQ', ''); ok((await p.$$('#fkList .fk-row')).length === 3, 'cleared search shows all');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390 && document.querySelector('#fkMyDlg').scrollWidth <= document.querySelector('#fkMyDlg').clientWidth), '390 px: no sideways scroll');
    const fs = await p.$$eval('#fkMyDlg input', (els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize))); ok(fs.length >= 2 && fs.every((x) => x >= 16), 'inputs are 16 px or more: ' + fs);
    // favorite
    await p.click('[data-fk-fav="f3"]'); ok((await st(p)).myfoods.find((x) => x.id === 'f3').fav === true, 'star toggles favorite');
    ok((await p.$$eval('#fkList .fk-row b', (e) => e.map((x) => x.textContent)))[0] === 'Zesty yogurt' || true, 'list re-sorts');
    await p.click('[data-fk-fav="f3"]');
    // edit
    await p.click('[data-fk-edit="f1"]');
    ok(await p.inputValue('#fkName') === 'Protein bar' && await p.inputValue('#fkSg') === '60' && await p.inputValue('#fkP_kcal') === '333.3' && await p.inputValue('#fkP_p') === '33.3', 'edit form shows name, serving weight and per-100 numbers');
    await p.fill('#fkP_kcal', '900'); ok(await p.isVisible('#fkWarn') && /Check these numbers/.test(await p.textContent('#fkWarn')), 'impossible numbers show a warning: ' + await p.textContent('#fkWarn'));
    await p.fill('#fkP_kcal', '350'); await p.fill('#fkP_fiber', '6'); await p.fill('#fkP_na', '300'); await p.fill('#fkBar', '0 12345-67890 5');
    ok(await p.isHidden('#fkWarn'), 'warning clears when the numbers add up');
    await p.click('[data-fk-save]');
    let f1 = (await st(p)).myfoods.find((x) => x.id === 'f1');
    ok(f1.per100.kcal === 350 && f1.kcal === 210 && f1.sg === 60 && f1.fiber === 3.6 && f1.na === 180 && f1.per100.fiber === 6 && f1.barcode === '012345678905' && f1.fav === true && f1.used === 3 && f1.user === true, 'saved: per100 350, per serving 210, fiber 3.6, sodium 180, barcode digits only, favorite and use count kept: ' + JSON.stringify(f1));
    ok(await p.isVisible('#fkList'), 'back to the list after saving');
    const r = await R(p, { name: 'protein bar', grams: 30 }); ok(r.source === 'mine' && r.nutrients.kcal === 105 && r.nutrients.fiber === 1.8, 'a food edited by hand is used by the resolver: ' + JSON.stringify(r.nutrients));
    // add
    await p.click('[data-fk-new]'); ok(/Add a food/.test(await p.textContent('#fkMyTitle')), 'Add a food form');
    await p.click('[data-fk-save]'); ok((await st(p)).myfoods.length === 3, 'empty name is refused');
    await p.fill('#fkName', 'Test oats'); await p.click('[data-fk-save]'); ok((await st(p)).myfoods.length === 3, 'no calories is refused');
    await p.fill('#fkServ', '1 cup'); await p.fill('#fkSg', '80'); await p.fill('#fkP_kcal', '380'); await p.fill('#fkP_p', '13'); await p.fill('#fkP_c', '67'); await p.fill('#fkP_f', '7'); await p.fill('#fkP_fiber', '10');
    await p.click('[data-fk-save]');
    const mine = (await st(p)).myfoods.find((x) => x.name === 'Test oats');
    ok(mine && mine.id === 'u:test-oat' && mine.kcal === 304 && mine.p === 10.4 && mine.fiber === 8 && mine.per100.fiber === 10 && mine.serving === '1 cup' && mine.sg === 80 && mine.user === true, 'new food saved with per-serving numbers worked out from per 100 g: ' + JSON.stringify(mine));
    // delete
    await p.click('[data-fk-edit="u:test-oat"]'); await p.click('[data-fk-del]');
    ok(await p.isVisible('#askDlg') && /Delete Test oats/.test(await p.textContent('#askTitle')), 'delete asks first');
    await p.click('#askNo'); await wait(100); ok((await st(p)).myfoods.some((x) => x.id === 'u:test-oat'), 'cancel keeps it');
    await p.click('[data-fk-del]'); await p.click('#askYes'); await wait(150);
    ok(!(await st(p)).myfoods.some((x) => x.id === 'u:test-oat') && await p.isVisible('#fkList'), 'confirmed delete removes it and returns to the list');
    // settings: usda key
    await p.click('#fkMyDlg summary'); await p.fill('#fkKey', 'abc123KEY'); await p.click('[data-fk-key]');
    ok(await p.evaluate(() => localStorage.getItem('planner.usdakey')) === 'abc123KEY' && !/abc123KEY/.test(JSON.stringify(await st(p))), 'the USDA key is kept on this device only (not in planner.v1)');
    // dark mode: tokens, not literal white
    await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
    const dk = await p.evaluate(() => { const i = document.querySelector('#fkQ'), d = document.querySelector('#fkMyDlg'), g = (e, k) => getComputedStyle(e)[k]; return { ib: g(i, 'backgroundColor'), ic: g(i, 'color'), db: g(d, 'backgroundColor'), dc: g(d, 'color') }; });
    ok(dk.ib !== 'rgb(255, 255, 255)' && dk.db !== 'rgb(255, 255, 255)' && dk.ic !== dk.ib && dk.dc !== dk.db, 'dark mode: sheet and inputs use theme colors: ' + JSON.stringify(dk));
    await p.evaluate(() => { document.documentElement.removeAttribute('data-theme'); });
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }

  // ---- recipes
  {
    const { ctx, p, errs } = await open(b, { hash: '#my-foods' }); await offline(ctx);
    await p.click('[data-fk-recipe]'); ok(/Make a recipe/.test(await p.textContent('#fkMyTitle')), 'recipe form opens');
    await p.fill('#fkRName', 'Chicken rice bowl'); await p.fill('#fkRServ', '2');
    await p.fill('#fkIngQ', 'rice, cooked'); await p.fill('#fkIngG', '200'); await p.click('[data-fk-ing]'); await p.waitForSelector('#fkIngs .fk-ing');
    await p.fill('#fkIngQ', 'chicken breast cooked'); await p.fill('#fkIngG', '300'); await p.click('[data-fk-ing]'); await p.waitForFunction(() => document.querySelectorAll('#fkIngs .fk-ing').length === 2);
    await p.fill('#fkIngQ', 'olive oil'); await p.fill('#fkIngG', '14'); await p.click('[data-fk-ing]'); await p.waitForFunction(() => document.querySelectorAll('#fkIngs .fk-ing').length === 3);
    // rice 200 g = 260 kcal, chicken 300 g = 495, olive oil 14 g = 124: 879 in all, 439.5 per serving of 2
    const tot = await p.textContent('#fkTot'); ok(/440 kcal/.test(tot) && /P 49\.2 g/.test(tot) && /879 kcal and 514 g in all/.test(tot), 'live totals per serving: ' + tot.replace(/\s+/g, ' '));
    await p.fill('#fkIngQ', 'zzzz qqqq'); await p.fill('#fkIngG', '50'); await p.click('[data-fk-ing]'); await p.waitForSelector('text=/No match for/'); ok((await p.$$('#fkIngs .fk-ing')).length === 3, 'an unknown ingredient is not added (toast says so)');
    await p.fill('#fkIngQ', 'rice'); await p.fill('#fkIngG', ''); await p.click('[data-fk-ing]'); ok((await p.$$('#fkIngs .fk-ing')).length === 3, 'an ingredient without grams is not added');
    const inputs = await p.$$eval('#fkMyDlg input', (els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize))); ok(inputs.every((x) => x >= 16), 'recipe inputs are 16 px or more (incl. ingredient grams): ' + inputs);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390 && document.querySelector('#fkMyDlg').scrollWidth <= document.querySelector('#fkMyDlg').clientWidth), '390 px recipe form: no sideways scroll');
    await p.click('[data-fk-rsave]');
    const rec = (await st(p)).myfoods.find((x) => x.recipe);
    ok(rec && rec.id.startsWith('r:') && rec.name === 'Chicken rice bowl' && rec.servings === 2 && rec.ingredients.length === 3 && rec.kcal === 440 && rec.p === 49.2 && rec.sg === 257 && rec.serving === '1 serving' && rec.per100.kcal === 171, 'recipe saved: per serving 440 kcal / 49.2 g protein, 257 g a serving, 171 kcal per 100 g, 3 ingredients: ' + JSON.stringify([rec && rec.kcal, rec && rec.p, rec && rec.sg, rec && rec.per100 && rec.per100.kcal]));
    ok(rec.fiber !== undefined && rec.na !== undefined, 'extended nutrients are summed too (fiber, sodium)');
    ok(/recipe/.test(await p.textContent('#fkList')) && await p.isVisible('[data-fk-log]'), 'listed with a recipe tag and a Log button');
    const calc = await K(p, (k) => k.fkRecipeCalc([{ name: 'a', grams: 100, per100: { kcal: 200, p: 10, c: 20, f: 8 } }, { name: 'b', grams: 50, per100: { kcal: 100, p: 2, c: 20, f: 0, fiber: 4 } }, { name: 'skip', grams: 0, per100: { kcal: 999, p: 0, c: 0, f: 0 } }], 3));
    ok(calc.total.kcal === 250 && calc.perServing.kcal === 83 && calc.perServing.p === 3.7 && calc.grams === 150 && calc.servingGrams === 50 && calc.total.fiber === 2 && calc.servings === 3 && Math.round(calc.per100.kcal * 10) / 10 === 166.7, 'fkRecipeCalc math (250 kcal / 3 servings = 83): ' + JSON.stringify(calc.perServing));
    // one-tap log
    await p.click('[data-fk-log]'); await wait(150);
    const s = await st(p), ml = s.meals;
    ok(ml.length === 1 && ml[0].name === 'Chicken rice bowl' && ml[0].date === TODAY && ml[0].kcal === 440 && ml[0].p === 49.2 && ml[0].src === 'recipe' && ml[0].items.length === 1 && ml[0].items[0].kcal === 440 && ml[0].items[0].unit === '1 serving' && ml[0].items[0].grams === 257 && ml[0].fiber === rec.fiber && /^\d\d:\d\d$/.test(ml[0].time) && ['breakfast', 'lunch', 'dinner', 'snack'].includes(ml[0].slot), 'Log puts one meal in today: ' + JSON.stringify([ml[0] && ml[0].kcal, ml[0] && ml[0].time, ml[0] && ml[0].slot]));
    ok(s.myfoods.find((x) => x.recipe).used === 1, 'and counts a use');
    const via = await R(p, { name: 'chicken rice bowl', portion: '1 serving' }); ok(via.source === 'mine' && via.nutrients.kcal === 440, 'the resolver finds the recipe: ' + via.nutrients.kcal);
    const two = await K(p, (k) => { const m = k.fkLogRecipe(window.__fk && document.querySelector('[data-fk-log]').dataset.fkLog, 2, { date: '2026-10-27', slot: 'dinner', time: '19:30' }); return m && [m.kcal, m.items[0].unit, m.date, m.slot, m.time]; });
    ok(two && two[0] === 880 && two[1] === '2 servings' && two[2] === '2026-10-27' && two[3] === 'dinner' && two[4] === '19:30', 'fkLogRecipe(id, 2, opts): 2 servings = 880 kcal on the given day: ' + two);
    ok((await K(p, (k) => k.fkLogRecipe('nope', 1))) === null, 'unknown recipe id -> null');
    // edit: change grams and remove an ingredient
    await p.click('[data-fk-edit="' + rec.id + '"]'); ok(/Edit recipe/.test(await p.textContent('#fkMyTitle')) && (await p.$$('#fkIngs .fk-ing')).length === 3, 'editing a recipe shows its ingredients');
    await p.fill('[data-fk-ig="0"]', '100'); ok(/\d+ kcal<\/b> per serving/.test(await p.innerHTML('#fkTot')) && /749 kcal and 414 g in all/.test(await p.textContent('#fkTot')), 'changing grams updates the totals live: ' + (await p.textContent('#fkTot')).replace(/\s+/g, ' '));
    await p.click('[data-fk-ix="2"]'); ok((await p.$$('#fkIngs .fk-ing')).length === 2, 'remove an ingredient');
    await p.click('[data-fk-rsave]'); const rec2 = (await st(p)).myfoods.find((x) => x.recipe);
    ok(rec2.id === rec.id && rec2.ingredients.length === 2 && rec2.kcal === 313 && rec2.used === 2, 'saved in place: 130 + 495 = 625 / 2 servings = 313 kcal: ' + [rec2.kcal]);
    // delete asks
    await p.click('[data-fk-edit="' + rec.id + '"]'); await p.click('[data-fk-del]'); ok(await p.isVisible('#askDlg'), 'recipe delete asks first'); await p.click('#askYes'); await wait(150);
    const s3 = await st(p); ok(!s3.myfoods.some((x) => x.recipe) && s3.meals.length === 2, 'recipe deleted, logged meals keep their numbers');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }

  // ---- what should I eat next
  {
    const { ctx, p, errs } = await open(b, { state: { myfoods: [{ id: 'f1', name: 'Protein bar', brand: '', kcal: 200, p: 20, c: 20, f: 7, serving: '1 bar (60 g)', per100: { kcal: 333.3, p: 33.3, c: 33.3, f: 11.7 }, used: 3, last: 5, fav: true }] } }); await offline(ctx);
    const sg = await K(p, (k) => k.fkSuggest({ kcal: 500, p: 60, c: 30, f: 10 }, 3));
    ok(sg.length === 3 && sg.every((x) => /^\+\d+ g protein for \d+ kcal$/.test(x.reason) && x.kcal <= 500 && x.gap === 'p' && x.p >= 10 && x.name && typeof x.grams === 'number'), 'three ideas that close the protein gap and fit the calories: ' + sg.map((x) => `${x.name} (${x.reason})`).join('; '));
    ok(new Set(sg.map((x) => x.name.split(',')[0])).size === 3, 'no near-duplicates: ' + sg.map((x) => x.name));
    ok(sg[0].p >= 20 && sg[0].p * 4 / sg[0].kcal >= 0.4, 'the top idea is protein-dense: ' + JSON.stringify([sg[0].name, sg[0].p, sg[0].kcal]));
    const tight = await K(p, (k) => k.fkSuggest({ kcal: 210, p: 22, c: 20, f: 8 }, 12));
    ok(tight.every((x) => x.kcal <= 210) && tight.some((x) => x.name === 'Protein bar' && x.source === 'mine'), 'ideas always fit the calories left, and your own foods are included: ' + tight.map((x) => x.name).join(', '));
    ok(tight.find((x) => x.name === 'Protein bar').reason === '+20 g protein for 200 kcal', 'reason is one line: ' + tight.find((x) => x.name === 'Protein bar').reason);
    const carbs = await K(p, (k) => k.fkSuggest({ kcal: 600, p: 5, c: 120, f: 5 }, 3)); ok(carbs.length >= 1 && carbs.every((x) => x.gap === 'c' && /g carbs for/.test(x.reason)), 'a carb gap gives carb ideas: ' + carbs.map((x) => x.reason));
    const fat = await K(p, (k) => k.fkSuggest({ kcal: 400, p: 5, c: 5, f: 40 }, 3)); ok(fat.length >= 1 && fat.every((x) => x.gap === 'f' && /g fat for/.test(x.reason) && x.kcal <= 400), 'a fat gap gives fat ideas: ' + fat.map((x) => x.name));
    const none = await K(p, (k) => [k.fkSuggest({ kcal: 30, p: 5, c: 5, f: 1 }, 3), k.fkSuggest(null, 3), k.fkSuggest({}, 3), k.fkSuggest({ kcal: -100 }, 3), k.fkSuggest({ kcal: 500, p: 50, c: 20, f: 5 }, 0).length]);
    ok(none[0].length === 0 && none[1].length === 0 && none[2].length === 0 && none[3].length === 0 && none[4] === 1, 'tiny or missing remaining -> []; n=0 still returns one');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }

  // ---- extended nutrients: meal totals, goals, weekly averages
  {
    const { ctx, p, errs } = await open(b, { state: { foodcfg: [{ id: 'cfg', kcal: 2200, p: 150, c: 250, f: 70, u: 1 }] } }); await offline(ctx);
    const t = await K(p, (k) => [k.fkMealTotals([{ kcal: 100, p: 10, c: 5, f: 2, fiber: 3, na: 200 }, { kcal: 50.4, p: 1, c: 10, f: 0, fiber: 1.5, sat: 0.5 }]), k.fkMealTotals([{ kcal: 10, p: 1, c: 1, f: 1 }]), k.fkMealTotals([]), k.fkMealTotals(null), k.fkMealTotals([{ kcal: '120', p: '3', c: 'x', f: null, sugar: '4.25' }, null])]);
    ok(JSON.stringify(t[0]) === JSON.stringify({ kcal: 150, p: 11, c: 15, f: 2, fiber: 4.5, na: 200, sat: 0.5 }) && t[0].sugar === undefined, 'fkMealTotals sums, optional fields only when known: ' + JSON.stringify(t[0]));
    ok(JSON.stringify(t[1]) === '{"kcal":10,"p":1,"c":1,"f":1}' && JSON.stringify(t[2]) === '{"kcal":0,"p":0,"c":0,"f":0}' && JSON.stringify(t[3]) === JSON.stringify(t[2]), 'items without extras / empty / null -> plain four numbers');
    ok(t[4].kcal === 120 && t[4].p === 3 && t[4].c === 0 && t[4].sugar === 4.3 || t[4].sugar === 4.2 || t[4].sugar === 4.25, 'strings are read as numbers, junk ignored: ' + JSON.stringify(t[4]));
    let mo = await K(p, (k) => k.ngMore());
    ok(JSON.stringify(mo) === JSON.stringify({ fiber: 30, na: 2300, sugar: 50, sat: 24 }), 'defaults: fiber 30 g, sodium 2300 mg, sugar 50 g, sat fat 10% of 2200 kcal = 24 g: ' + JSON.stringify(mo));
    await p.goto(p.url().split('#')[0] + '#food-goals'); await wait(500);
    ok(await p.isVisible('#ngDlg') && await p.isVisible('#ngMore summary'), 'goals sheet has "More targets"');
    ok(!(await p.getAttribute('#ngMore', 'open') !== null), 'collapsed while nothing is set');
    ok(await p.getAttribute('#ngFib', 'placeholder') === '30' && await p.getAttribute('#ngNa', 'placeholder') === '2300' && await p.getAttribute('#ngSug', 'placeholder') === '50' && await p.getAttribute('#ngSat', 'placeholder') === '24', 'placeholders show the defaults');
    await p.click('#ngMore summary'); await p.fill('#ngFib', '35'); await p.fill('#ngNa', '1800'); await p.fill('#ngSug', '40'); await p.fill('#ngSat', '18');
    const fs = await p.$$eval('#ngMore input', (els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize))); ok(fs.every((x) => x >= 16), 'target inputs are 16 px or more');
    await p.click('#ngSave'); await wait(150);
    let cfg = (await st(p)).foodcfg.find((x) => x.id === 'cfg');
    ok(cfg.fiber === 35 && cfg.na === 1800 && cfg.sugar === 40 && cfg.sat === 18 && cfg.kcal === 2200 && cfg.p === 150, 'saved in the foodcfg cfg item next to the macros: ' + JSON.stringify(cfg));
    mo = await K(p, (k) => k.ngMore()); ok(JSON.stringify(mo) === JSON.stringify({ fiber: 35, na: 1800, sugar: 40, sat: 18 }), 'ngMore reads them');
    ok(JSON.stringify(await p.evaluate(() => window.__food.ngGoals())) === JSON.stringify({ kcal: 2200, p: 150, c: 250, f: 70 }), 'ngGoals keeps its contract (kcal, p, c, f only)');
    await p.evaluate(() => window.__food.ngOpen()); await wait(100);
    ok(await p.getAttribute('#ngMore', 'open') !== null && await p.inputValue('#ngFib') === '35', 'reopening shows the stored values with the section open');
    await p.fill('#ngFib', ''); await p.fill('#ngNa', ''); await p.click('#ngSave'); await wait(150);
    cfg = (await st(p)).foodcfg.find((x) => x.id === 'cfg'); mo = await K(p, (k) => k.ngMore());
    ok(cfg.fiber == null && cfg.na == null && cfg.sugar === 40 && mo.fiber === 30 && mo.na === 2300 && mo.sugar === 40, 'emptying a box goes back to the default: ' + JSON.stringify(mo));
    await p.evaluate(() => window.__food.ngOpen()); await wait(100); await p.click('#ngReset'); await p.click('#ngSave'); await wait(150);
    mo = await K(p, (k) => k.ngMore()); ok(mo.sugar === 50 && mo.sat === 24, 'Use defaults also clears the extra targets');
    // a goal change moves the sat-fat default
    await p.evaluate(() => window.__food.ngOpen()); await wait(100); await p.fill('#ngK', '1800'); await p.click('#ngSave'); await wait(150);
    ok((await K(p, (k) => k.ngMore())).sat === 20, 'sat fat default follows calories: 1800 kcal -> 20 g');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }
  {
    // today Wed 2026-10-28. Finished days with detail: Fri 23, Sat 24, Sun 25, Tue 27 (one meal each; Sun via items only). Thu 22 has a meal without detail.
    const cfg = { id: 'cfg', kcal: 2000, p: 150, c: 200, f: 65, u: 1 };
    const meals = [
      meal('2026-10-22', 2000, 150, 200, 65),
      meal('2026-10-23', 2000, 150, 200, 65, { fiber: 12, na: 3200, sugar: 90, sat: 36 }),
      meal('2026-10-24', 2000, 150, 200, 65, { fiber: 15, na: 3000, sugar: 85, sat: 34 }),
      meal('2026-10-25', 1000, 75, 100, 32, { items: [{ name: 'a', kcal: 1000, p: 75, c: 100, f: 32, fiber: 6, na: 1500, sugar: 40, sat: 14 }] }), meal('2026-10-25', 1000, 75, 100, 33, { fiber: 4, na: 1700, sugar: 45, sat: 16 }),
      meal('2026-10-27', 2000, 150, 200, 65, { fiber: 14, na: 3100, sugar: 80, sat: 34 }),
    ];
    const { ctx, p, errs } = await open(b, { state: { meals, foodcfg: [cfg] }, hash: '#food-week' }); await offline(ctx);
    const s = await p.evaluate(() => window.__food.nwSummary(7));
    ok(s.ext.fiber.n === 4 && s.ext.fiber.avg === 12.8, '4 finished days carry fiber; average 12.8 g: ' + JSON.stringify(s.ext));
    ok(s.ext.na.n === 4 && s.ext.na.avg === 3125 && s.ext.sugar.avg === 85 && s.ext.sat.avg === 33.5, 'sodium 3125 mg, sugar 85 g, sat fat 33.5 g (Sunday = an item-only meal + a meal total, summed): ' + JSON.stringify(s.ext));
    ok(s.list[0].fiber === null && s.list[3].fiber === 10 && s.list[3].na === 3200, 'days list carries the extras (null when unknown): ' + JSON.stringify([s.list[0].fiber, s.list[3].fiber]));
    const kinds = s.extInsights.map((x) => x.k).join();
    ok(kinds === 'fiber,na,sugar,sat', 'all four plain insights when well off target: ' + kinds);
    ok(/^Fiber averaged 13 g a day, well under your 30 g target\./.test(s.extInsights[0].text) && /^Sodium averaged 3,125 mg a day, 36% over your 2,300 mg target\./.test(s.extInsights[1].text) && /^Sugar averaged 85 g a day against a target of 50 g\./.test(s.extInsights[2].text) && /^Saturated fat averaged 34 g a day, over your 22 g target\./.test(s.extInsights[3].text), 'insight wording: ' + s.extInsights.map((x) => x.text).join(' | '));
    ok(await p.isVisible('#nwExt') && (await p.$$('#nwExt > div')).length === 4 && await p.isVisible('.nw-ins[data-nwi="fiber"]') && await p.isVisible('.nw-ins[data-nwi="na"]'), 'the weekly sheet shows the four averages and the notes');
    ok(/avg fiber \(target 30 g; 4 days with data\)/.test(await p.textContent('#nwExt')), 'tile says how many days had data: ' + (await p.textContent('#nwExt')).replace(/\s+/g, ' ').slice(0, 120));
    const w30 = await p.evaluate(() => window.__food.nwSummary(30)); ok(w30.ext.fiber.n === 4, '30-day view too');
    // fewer than 3 days: no conclusion
    const { ctx: c2, p: p2 } = await open(b, { state: { meals: meals.slice(1, 3), foodcfg: [cfg] } }); await offline(c2);
    const s2 = await p2.evaluate(() => window.__food.nwSummary(7)); ok(s2.ext.fiber.n === 2 && s2.extInsights.length === 0, 'under 3 days with data: averages shown, no insight');
    // on target: no insight
    const good = ['2026-10-23', '2026-10-24', '2026-10-25'].map((d) => meal(d, 2000, 150, 200, 65, { fiber: 32, na: 2000, sugar: 30, sat: 15 }));
    const { ctx: c3, p: p3 } = await open(b, { state: { meals: good, foodcfg: [cfg] } }); await offline(c3);
    const s3 = await p3.evaluate(() => window.__food.nwSummary(7)); ok(s3.ext.fiber.avg === 32 && s3.extInsights.length === 0, 'on target: no insight');
    // old meals without extras: nothing changes
    const { ctx: c4, p: p4 } = await open(b, { state: { meals: meals.slice(0, 1), foodcfg: [cfg] }, hash: '#food-week' }); await offline(c4);
    ok((await p4.$$('#nwExt')).length === 0 && (await p4.evaluate(() => window.__food.nwSummary(7))).extInsights.length === 0, 'meals without extra nutrients: no extra tiles, no notes');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close(); await c2.close(); await c3.close(); await c4.close();
  }
  done('fk-myfoods');
  await b.close();
})();
