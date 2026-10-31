// Daily food goals + calculator: PORT=8791 node planner/tests/nutgoals.test.js  (serve the site first, see lib-food.js)
const { chromium, wait, checker, open, st } = require('./lib-food');
(async () => {
  const { ok, done } = checker();
  const b = await chromium.launch();
  const F = (p, fn, ...a) => p.evaluate(`(async()=>{const f=window.__food;return (${fn.toString()})(f,...${JSON.stringify(a)})})()`);
  const { ctx, p, errs } = await open(b);
  // defaults before anything is set
  ok(JSON.stringify(await F(p, (f) => f.ngGoals())) === JSON.stringify({ kcal: 2200, p: 150, c: 250, f: 70 }), 'defaults 2200/150/250/70');
  ok((await F(p, (f) => f.ngHasGoals())) === false, 'ngHasGoals false at first');
  // hand-checked numbers. Man, 30 y, 180 cm, 80 kg: BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; moderate x1.55 = 2759;
  // lose 0.5 kg/week = -550 -> 2209 -> 2210; protein 1.8*80 = 144 g; fat 27% = 66 g; carbs (2210 - 576 - 594)/4 = 260 g.
  const r = await F(p, (f) => f.ngCalc({ sex: 'm', age: 30, height_cm: 180, weight_kg: 80, activity: 'moderate', goal: 'lose', rate: 0.5 }));
  ok(r.bmr === 1780 && r.tdee === 2759 && r.delta === -550 && r.raw === 2209 && r.kcal === 2210 && !r.floored, 'man lose: BMR 1780, TDEE 2759, 2210 kcal: ' + JSON.stringify(r));
  ok(r.p === 144 && r.f === 66 && r.c === 260, 'macros 144 / 260 / 66: ' + [r.p, r.c, r.f]);
  // Woman, 25 y, 160 cm, 55 kg: BMR = 550 + 1000 - 125 - 161 = 1264; sedentary x1.2 = 1516.8; lose 0.75 = -825 -> 691.8 -> floor 1200.
  const w = await F(p, (f) => f.ngCalc({ sex: 'f', age: 25, height_cm: 160, weight_kg: 55, activity: 'sedentary', goal: 'lose', rate: 0.75 }));
  ok(w.bmr === 1264 && w.tdee === 1517 && w.raw === 692 && w.kcal === 1200 && w.floored && w.p === 99, 'woman floor 1200: ' + JSON.stringify(w));
  const m = await F(p, (f) => f.ngCalc({ sex: 'm', age: 50, height_cm: 165, weight_kg: 60, activity: 'sedentary', goal: 'lose', rate: 0.75 }));
  ok(m.kcal === 1500 && m.floored, 'man floor 1500: ' + m.kcal);
  const g = await F(p, (f) => f.ngCalc({ sex: 'm', age: 30, height_cm: 180, weight_kg: 80, activity: 'moderate', goal: 'gain', rate: 0.25 }));
  ok(g.kcal === 3030 || g.kcal === 3040, 'gain 0.25 kg/wk: +275 -> ' + g.kcal);
  const mt = await F(p, (f) => f.ngCalc({ sex: 'm', age: 30, height_cm: 180, weight_kg: 80, activity: 'moderate', goal: 'maintain' }));
  ok(mt.kcal === 2760 && mt.delta === 0, 'maintain = TDEE rounded to 10: ' + mt.kcal);
  ok((await F(p, (f) => f.ngCalc({ sex: 'm', age: 30, height_cm: 0, weight_kg: 80 }))) === null, 'missing height -> null');

  // sheet: opens on the calculator first time
  await p.goto(require('./lib-food').URL + '#food-goals'); await wait(900);
  ok(await p.isVisible('#ngDlg'), '#food-goals opens the sheet');
  ok(/Work them out/.test(await p.textContent('#ngBody')) && await p.isVisible('#ngAge'), 'calculator shown when no goals yet');
  ok(/not medical advice/i.test(await p.textContent('#ngBody')) && /1,200/.test(await p.textContent('#ngBody')) && /1,500/.test(await p.textContent('#ngBody')), 'labelled as an estimate, floors stated');
  ok(await p.evaluate(() => [...document.querySelectorAll('#ngDlg input,#ngDlg select')].every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16)), 'all inputs 16px');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll at 390');
  // US units: 180 cm = 70.87 in, 80 kg = 176.37 lb
  await p.click('[data-ngu="us"]'); await p.fill('#ngAge', '30'); await p.fill('#ngH', '70.87'); await p.fill('#ngW', '176.37'); await p.selectOption('#ngAct', 'moderate');
  await p.click('[data-ngg="lose"]'); await p.selectOption('#ngRate', '0.5');
  const big = await p.textContent('#ngBig'); ok(/2,2[01]0/.test(big), 'live result in lb/in units (2,210 +- rounding): ' + big);
  await p.click('[data-ngu="metric"]'); await wait(50);
  ok(Math.abs(+(await p.inputValue('#ngH')) - 180) < 0.2 && Math.abs(+(await p.inputValue('#ngW')) - 80) < 0.1, 'switching units converts what was typed: ' + await p.inputValue('#ngH') + ' / ' + await p.inputValue('#ngW'));
  await p.click('[data-ngs="m"]'); await p.fill('#ngH', '180'); await p.fill('#ngW', '80');
  ok(/2,210/.test(await p.textContent('#ngBig')) && /144 g/.test(await p.textContent('#ngRes')) && /260 g/.test(await p.textContent('#ngRes')) && /66 g/.test(await p.textContent('#ngRes')), 'UI shows 2,210 kcal, 144 / 260 / 66 g: ' + (await p.textContent('#ngRes')).slice(0, 120));
  ok(!(await p.locator('#ngFloorMsg').count()), 'no floor message when above the floor');
  // floor message
  await p.click('[data-ngs="f"]'); await p.fill('#ngAge', '25'); await p.fill('#ngH', '160'); await p.fill('#ngW', '55'); await p.selectOption('#ngAct', 'sedentary'); await p.selectOption('#ngRate', '0.75');
  ok(/1,200/.test(await p.textContent('#ngBig')) && /minimum|floor/i.test(await p.textContent('#ngFloorMsg')), 'floor message shown at 1,200: ' + await p.textContent('#ngFloorMsg'));
  // back to the man and save
  await p.click('[data-ngs="m"]'); await p.fill('#ngAge', '30'); await p.fill('#ngH', '180'); await p.fill('#ngW', '80'); await p.selectOption('#ngAct', 'moderate'); await p.selectOption('#ngRate', '0.5');
  await p.click('#ngUse'); await wait(300);
  ok(!(await p.isVisible('#ngDlg')), 'Use these goals closes the sheet');
  let s = await st(p); const c = s.foodcfg.find((x) => x.id === 'cfg');
  ok(c && c.kcal === 2210 && c.p === 144 && c.c === 260 && c.f === 66 && c.sex === 'm' && c.age === 30 && c.height_cm === 180 && c.weight_kg === 80 && c.activity === 'moderate' && c.goal === 'lose', 'foodcfg saved: ' + JSON.stringify(c));
  ok(s.foodcfg.length === 1, 'one cfg item');
  ok(JSON.stringify(await F(p, (f) => f.ngGoals())) === JSON.stringify({ kcal: 2210, p: 144, c: 260, f: 66 }) && (await F(p, (f) => f.ngHasGoals())) === true, 'ngGoals/ngHasGoals read it');
  // direct entry
  await F(p, (f) => f.ngOpen());
  ok(/Calories per day/.test(await p.textContent('#ngBody')) && await p.inputValue('#ngK') === '2210', 'reopens on direct entry with saved numbers');
  await p.fill('#ngK', '2000'); await p.fill('#ngP', '160'); await p.fill('#ngC', '200'); await p.fill('#ngF', '60');
  ok(/1,980 kcal/.test(await p.textContent('#ngSum')), 'macro check line: ' + await p.textContent('#ngSum'));
  await p.fill('#ngK', '300'); await p.click('#ngSave'); await wait(100);
  ok(await p.isVisible('#ngDlg') && (await st(p)).foodcfg[0].kcal === 2210, 'out-of-range calories refused');
  await p.fill('#ngK', '2000'); await p.click('#ngSave'); await wait(200);
  s = await st(p); const c2 = s.foodcfg[0];
  ok(c2.kcal === 2000 && c2.p === 160 && c2.c === 200 && c2.f === 60 && c2.age === 30 && c2.weight_kg === 80, 'direct save keeps the calculator inputs: ' + JSON.stringify(c2));
  await F(p, (f) => f.ngOpen()); await p.click('#ngReset'); ok(await p.inputValue('#ngK') === '2200', 'Use defaults resets the fields (not saved until Save)');
  ok((await st(p)).foodcfg[0].kcal === 2000, 'reset does not save by itself');
  ok(!errs.length, 'no page errors ' + errs);
  await ctx.close(); await b.close(); done('NUTGOALS');
})();
