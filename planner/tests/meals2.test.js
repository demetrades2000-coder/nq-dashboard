// Meals tabs: Foods, Coach (AI mocked), Trends. node planner/tests/meals2.test.js (PORT default 8777)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.clock.setFixedTime(new Date('2026-11-04T17:30:00'));
  const reqs = [];
  await p.route('https://api.anthropic.com/v1/messages', async (route) => { let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) { /* none */ } reqs.push(body);
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '- Have the Greek yogurt bowl: about 180 kcal and 30 g protein.\n- Add a banana if you are still hungry.' }], stop_reason: 'end_turn' }) }); });
  await p.addInitScript(() => { localStorage.setItem('planner.aikey', 'sk-ant-test'); });
  await p.goto(URL + '#today'); await wait(1500);
  const day = (d, n, k, pr) => ({ id: 'm' + d + n, date: d, time: '12:00', slot: 'lunch', name: n, items: [], kcal: k, p: pr, c: 40, f: 10, src: 'manual', created: Date.parse(d) + 1 });
  await p.evaluate((rows) => { const s = JSON.parse(localStorage.getItem('planner.v1') || '{}'); s.meals = rows; s.foodcfg = [{ id: 'cfg', kcal: 2000, p: 150, c: 220, f: 65, sex: 'm', age: 30 }]; localStorage.setItem('planner.v1', JSON.stringify(s)); },
    [day('2026-11-04', 'Chicken burrito bowl', 700, 55), day('2026-11-03', 'Chicken burrito bowl', 700, 55), day('2026-11-03', 'Oats and whey', 450, 40), day('2026-11-02', 'Chicken burrito bowl', 720, 54), day('2026-11-02', 'Steak and rice', 1200, 70), day('2026-11-01', 'Pizza', 2300, 80)]);
  await p.reload(); await wait(1200);
  await p.click('#mlBtn'); await wait(300);
  ok(await p.isVisible('#mlPaneToday') && !(await p.isVisible('#mlPaneCoach')), 'opens on Today');
  // Foods
  await p.click('[data-mltab="foods"]'); await wait(200);
  ok(await p.isVisible('#mlPaneFoods') && /Your usual meals/.test(await p.textContent('#mlPaneFoods')) && /Chicken burrito bowl/.test(await p.textContent('#mlPaneFoods')), 'Foods lists usual meals');
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.length);
  await p.click('#mlPaneFoods [data-mlq1]'); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.length)) === before + 1, 'tap logs a usual meal again');
  // Trends
  await p.click('[data-mltab="trends"]'); await wait(200);
  ok((await p.$$('#mlPaneTrends .ml-bars > div')).length === 7, 'seven bars');
  ok(/kcal a day/.test(await p.textContent('#mlPaneTrends')), 'average shown: ' + (await p.textContent('#mlPaneTrends')).replace(/\s+/g, ' ').slice(0, 160));
  // Coach
  await p.click('[data-mltab="coach"]'); await wait(200);
  ok(/kcal left today/.test(await p.textContent('#mlPaneCoach')), 'remaining shown');
  ok((await p.$$('#mlPaneCoach [data-mlpick]')).length >= 1 || !/Fits what is left/.test(await p.textContent('#mlPaneCoach')), 'picks list consistent');
  await p.click('[data-mlask="What should I eat next?"]'); await p.waitForFunction(() => /Greek yogurt/.test(document.querySelector('#mlCoachOut').textContent), null, { timeout: 8000 });
  const body = reqs[reqs.length - 1]; const content = body.messages[0].content;
  ok(body.model === 'claude-haiku-5-5' && /eaten_today/.test(content) && /remaining_today/.test(content) && /Chicken burrito bowl/.test(content) && /What should I eat next/.test(content), 'coach gets the day as context');
  ok(!/image/.test(JSON.stringify(body.messages)), 'coach sends no image');
  await p.fill('#mlCoachQ', 'Is oats ok before work?'); await p.press('#mlCoachQ', 'Enter'); await p.waitForFunction(() => document.querySelectorAll('#mlCoachOut .ml-ans').length >= 2, null, { timeout: 8000 });
  ok(reqs.length === 2, 'second question sent');
  // tab keeps working after closing/reopening, deep link
  await p.click('#mlDlg [data-close]'); await p.goto(URL + '#meals'); await wait(1200); ok(await p.isVisible('#mlDlg'), '#meals still opens');
  const small = await p.evaluate(() => [...document.querySelectorAll('#mlDlg input')].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id)); ok(small.length === 0, 'inputs under 16px ' + small);
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('MEALS2 OK');
})();
