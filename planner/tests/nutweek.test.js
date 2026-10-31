// Eating this week and month: PORT=8791 node planner/tests/nutweek.test.js  (serve the site first, see lib-food.js)
const { chromium, wait, checker, open, meal, URL } = require('./lib-food');
(async () => {
  const { ok, done } = checker();
  const b = await chromium.launch();
  const F = (p, fn, ...a) => p.evaluate(`(async()=>{const f=window.__food;return (${fn.toString()})(f,...${JSON.stringify(a)})})()`);
  const cfg = { id: 'cfg', kcal: 2000, p: 150, c: 200, f: 65, u: 1 };
  // today = Wed 2026-10-28. Finished days: Thu 22 (2000), Fri 23 (1900), Sat 24 (2600), Sun 25 (2300), Tue 27 (1800); Mon 26 empty; today 500 (unfinished).
  const meals = [
    meal('2026-10-22', 1200, 90, 120, 40), meal('2026-10-22', 800, 60, 80, 25),
    meal('2026-10-23', 1900, 120, 190, 60), meal('2026-10-24', 2600, 90, 280, 100), meal('2026-10-25', 2300, 100, 250, 80), meal('2026-10-27', 1800, 110, 170, 60),
    meal('2026-10-28', 500, 40, 50, 15),
  ];
  const { ctx, p, errs } = await open(b, { state: { meals, foodcfg: [cfg] }, hash: '#food-week' });
  ok(await p.isVisible('#nwDlg'), '#food-week opens the sheet');
  const s = await F(p, (f) => f.nwSummary(7));
  ok(s.days === 7 && s.list.length === 7 && s.list[0].date === '2026-10-22' && s.list[6].date === '2026-10-28' && s.list[6].today, '7 days ending today');
  ok(s.list[0].kcal === 2000 && s.list[0].n === 2 && s.list[0].p === 150, 'two meals on a day are summed');
  ok(s.logged === 6 && s.used === 5, 'logged 6 days, 5 finished (today at 500 of 2000 is left out): ' + s.logged + '/' + s.used);
  ok(s.avgKcal === 2120 && s.avgP === 114, 'averages: 2120 kcal, 114 g protein: ' + s.avgKcal + ' / ' + s.avgP);
  ok(s.within === 3 && s.proteinHit === 1, 'within 10%: Thu, Fri, Tue = 3; protein >= 90% of goal: Thu only = 1: ' + s.within + '/' + s.proteinHit);
  ok(s.best.date === '2026-10-22' && s.worst.date === '2026-10-24', 'best Thu, worst Sat');
  const kp = 4 * (150 + 120 + 90 + 100 + 110), kc = 4 * (200 + 190 + 280 + 250 + 170), kf = 9 * (65 + 60 + 100 + 80 + 60), kt = kp + kc + kf;
  ok(Math.abs(s.split.p - kp / kt * 100) <= 1 && Math.abs(s.split.c - kc / kt * 100) <= 1 && Math.abs(s.split.f - kf / kt * 100) <= 1 && s.split.p + s.split.c + s.split.f === 100, 'macro split sums to 100 and matches: ' + JSON.stringify(s.split));
  ok(s.insights.length === 2 && /^Protein averaged 114 g, 36 g under your goal of 150 g; chicken or Greek yogurt at lunch would close it\.$/.test(s.insights[0].text), 'protein insight: ' + s.insights[0].text);
  ok(/Weekends averaged 2,450 kcal, 550 more than weekdays \(1,900\)/.test(s.insights[1].text), 'weekend insight: ' + s.insights[1].text);
  // today counts once it passes 60% of the goal
  const s2 = await F(p, (f) => { return f.nwSummary(7).used; });
  ok(s2 === 5, 'stable');
  // chart geometry: ymax 3000, plot height 132, goal line at y = 14 + (1 - 2000/3000) * 132 = 58
  const g = await F(p, (f) => { const x = f.nwGeom(f.nwSummary(7)); return { ymax: x.ymax, goalY: x.goalY, bars: x.bars }; });
  ok(g.ymax === 3000 && g.goalY === 58, 'axis max 3000, goal line y=58: ' + g.ymax + '/' + g.goalY);
  const bar = (d) => g.bars.find((x) => x.date === d);
  ok(Math.abs(bar('2026-10-24').h - 114.4) < 0.05 && Math.abs(bar('2026-10-22').h - 88) < 0.05 && bar('2026-10-26').h === 0, 'bar heights are to scale (2600 -> 114.4, 2000 -> 88, none -> 0)');
  ok(Math.abs(bar('2026-10-24').h / bar('2026-10-27').h - 2600 / 1800) < 0.01, 'height ratio equals kcal ratio');
  ok(Math.abs(bar('2026-10-22').y + bar('2026-10-22').h - 146) < 0.05, 'bars sit on the baseline (y + h = 146)');
  // DOM
  const dom = await p.evaluate(() => [...document.querySelectorAll('#nwChart rect.b')].map((r) => ({ d: r.dataset.d, h: +r.getAttribute('height'), cls: r.getAttribute('class') })));
  ok(dom.length === 7, '7 bars drawn');
  ok(Math.abs(dom.find((x) => x.d === '2026-10-24').h - 114.4) < 0.05, 'DOM bar height matches');
  ok(/\bt\b/.test(dom.find((x) => x.d === '2026-10-28').cls) && !/\bt\b/.test(dom.find((x) => x.d === '2026-10-27').cls), 'today bar is highlighted');
  ok(/ok/.test(dom.find((x) => x.d === '2026-10-22').cls) && /over/.test(dom.find((x) => x.d === '2026-10-24').cls), 'in-range bar green, over bar amber');
  ok(Math.abs(+(await p.getAttribute('#nwGoalLine', 'y1')) - 58) < 0.05, 'goal line drawn at y=58 in the DOM');
  const stats = await p.textContent('#nwStats');
  ok(/2,120/.test(stats) && /114 g/.test(stats) && /6 of 7/.test(stats) && /3 of 5/.test(stats) && /1 of 5/.test(stats), 'stat tiles: ' + stats.replace(/\s+/g, ' '));
  ok(/Furthest from goal: Sat Oct 24, 2,600 kcal \(600 over\)/.test(await p.textContent('#nwWorst')), 'worst day line: ' + await p.textContent('#nwWorst'));
  ok(await p.locator('#nwSplit').count() === 1 && await p.locator('[data-nwi]').count() === 2, 'split bar and 2 insights shown');
  await p.click('[data-nwd="2026-10-24"]');
  ok(/Sat Oct 24: 2,600 kcal, protein 90 g, carbs 280 g, fat 100 g \(1 meal\)/.test(await p.textContent('#nwSel')), 'tapping a bar shows the day: ' + await p.textContent('#nwSel'));
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390 && await p.evaluate(() => { const s = document.querySelector('#nwChart').getBoundingClientRect(); return s.right <= innerWidth && s.width > 250; }), 'no sideways scroll; chart fits at 390');
  // 30 days
  await p.click('[data-nwr="30"]');
  const n30 = await p.evaluate(() => document.querySelectorAll('#nwChart rect.b').length);
  ok(n30 === 30, '30-day chart has 30 bars: ' + n30);
  ok(/6 of 30/.test(await p.textContent('#nwStats')), '30-day days logged: 6 of 30');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll at 30 days');
  await p.screenshot({ path: '/tmp/nutweek.png' });
  await ctx.close();

  // today counts when it is past 60% of the goal; fewer than 3 days -> no conclusions
  {
    const m2 = [meal('2026-10-27', 1900, 130, 200, 60), meal('2026-10-28', 1400, 100, 150, 40)];
    const { ctx, p } = await open(b, { state: { meals: m2, foodcfg: [] }, hash: '#food-week' });
    const t = await F(p, (f) => f.nwSummary(7));
    ok(t.goal.kcal === 2200 && t.used === 2 && !t.ready && t.insights.length === 0 && t.best === null, 'defaults used (2200); 2 days (today counts at 1400 >= 60% of 2200) -> not ready, no insights');
    ok(/Log at least 3 days/.test(await p.textContent('#nwMin')) && await p.locator('[data-nwi]').count() === 0, 'UI says it needs 3 days and shows no conclusions: ' + await p.textContent('#nwMin'));
    await ctx.close();
  }
  // nothing logged
  {
    const { ctx, p } = await open(b, { hash: '#food-week' });
    ok(/No meals logged/.test(await p.textContent('#nwEmpty')) && await p.locator('#nwChart').count() === 0, 'empty state with no meals');
    const e = await F(p, (f) => f.nwSummary(30));
    ok(e.logged === 0 && e.avgKcal === 0 && e.split === null && e.list.length === 30, 'empty summary is safe');
    await ctx.close();
  }
  // good week: no negative insights, steady message
  {
    const ms = [22, 23, 24, 25, 27].map((d, i) => meal('2026-10-' + d, 2000 + (i - 2) * 50, 150, 220, 60));
    const { ctx, p } = await open(b, { state: { meals: ms, foodcfg: [cfg] }, hash: '#food-week' });
    const t = await F(p, (f) => f.nwSummary(7));
    ok(t.insights.length === 2 && t.insights.every((x) => !/under your goal|over your goal/.test(x.text)) && /steady/.test(t.insights[0].text), 'on-target week gets positive insights only: ' + t.insights.map((x) => x.text).join(' | '));
    await ctx.close();
  }
  // calories well over
  {
    const ms = [22, 23, 24, 25, 27].map((d) => meal('2026-10-' + d, 2600, 160, 300, 90));
    const { ctx, p } = await open(b, { state: { meals: ms, foodcfg: [cfg] }, hash: '#food-week' });
    const t = await F(p, (f) => f.nwSummary(7));
    ok(/averaged 2,600, 600 over your goal of 2,000 \(30% over\)/.test(t.insights[0].text) && /5 of 5 days ran over/.test(t.insights[0].text), 'over-goal insight: ' + t.insights[0].text);
    await ctx.close();
  }
  ok(!errs.length, 'no page errors ' + errs);
  await b.close(); done('NUTWEEK');
})();
