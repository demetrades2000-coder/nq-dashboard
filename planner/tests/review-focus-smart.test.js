const { open, state, noHScroll, gotoView, run, ok, eq, SHOTS } = require('./lib');

run('review + focus + smart lists', async (browser) => {
  for (const size of ['desktop', 'phone']) {
    console.log(' ' + size);
    const { page, errors } = await open(browser, size);
    const info = await page.evaluate(() => {
      const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const d = new Date(); const out = { today: key(d) };
      for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() - i); out['d' + i] = key(x); }
      return out;
    });
    // seed P&L for this and last week, tasks of each kind
    await page.evaluate((i) => {
      const pnl = { [i.d0]: 300, [i.d1]: -120.4, [i.d2]: 450, [i.d3]: 80 };
      localStorage.setItem('planner.nq', JSON.stringify({ t: Date.now(), doc: { bot: 'NQ bots', events: [] }, pnl }));
      const S = JSON.parse(localStorage.getItem('planner.v1') || '{}');
      const t = (id, title, o) => ({ id, title, date: '', done: false, p: 0, proj: '', rep: '', created: 1, ...o });
      S.tasks = [t('a', 'Overdue thing', { date: i.d6 }), t('b', 'High thing', { p: 3 }), t('c', 'Undated thing'), t('d', 'Done thing', { done: true, doneAt: Date.now(), date: i.today }), t('e', 'Week thing', { date: i.today, proj: 'nq' })];
      S.journal = [{ id: 'j:' + i.d1, date: i.d1, note: '', mood: 3, rules: 'yes' }, { id: 'j:' + i.d2, date: i.d2, note: '', mood: 3, rules: 'yes' }, { id: 'j:' + i.d3, date: i.d3, note: '', mood: 3, rules: 'no' }];
      S.habits = [{ id: 'h1', name: 'Workout', color: '#ea580c', days: [0, 1, 2, 3, 4, 5, 6], done: [i.today], created: i.d6 }];
      localStorage.setItem('planner.v1', JSON.stringify(S));
    }, info);
    await page.reload();

    // ----- smart lists (Projects view)
    await gotoView(page, 'projects');
    const counts = await page.$$eval('[data-sl]', (bs) => bs.map((b) => b.querySelector('.n').textContent));
    eq(counts[0], '1', 'overdue count');
    ok(counts[2] === '1' && counts[3] === '2' || counts[3] === '1', 'high / no-date counts plausible');
    await page.click('[data-sl="overdue"]');
    eq(await page.$$eval('#main .sl .t-in', (e) => e.map((x) => x.textContent)), ['Overdue thing'], 'overdue list contents');
    await page.click('[data-sl="high"]');
    eq(await page.$$eval('#main .sl .t-in', (e) => e.map((x) => x.textContent)), ['High thing'], 'high priority list');
    await page.click('[data-sl="recent"]');
    eq(await page.$$eval('#main .sl .t-in', (e) => e.map((x) => x.textContent)), ['Done thing'], 'done recently list');
    await page.click('[data-sl="recent"]');
    ok((await page.locator('#main .sl .pc').count()) === 0, 'tapping a chip again clears it');
    ok(await noHScroll(page), 'projects with smart lists: no horizontal scroll');
    await page.screenshot({ path: `${SHOTS}/smart-${size}.png` });

    // ----- focus timer
    await gotoView(page, 'month');
    await page.locator('#tasks .fbtn').first().click();
    await page.click('[data-flen="15"]');
    await page.click('#focForm button[type=submit]');
    let s = await state(page);
    ok(s.focus && s.focus.min === 15 && s.focus.status === 'run', 'timer started (15 min), start time stored');
    ok(await page.locator('#focusBar:not([hidden])').count() === 1, 'sticky bar visible');
    ok(/^1[45]:\d\d$/.test(await page.locator('#fbTime').innerText()), 'countdown shown');
    await page.reload();
    ok(await page.locator('#focusBar:not([hidden])').count() === 1, 'timer survives reload');
    ok(await noHScroll(page), 'focus bar: no horizontal scroll');
    await page.screenshot({ path: `${SHOTS}/focus-${size}.png` });
    // pretend it started 15 min ago -> finishes, logs, shows alert
    await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('planner.v1')); S.focus.start = Date.now() - 15 * 60000 - 1000; localStorage.setItem('planner.v1', JSON.stringify(S)); });
    await page.reload();
    await page.waitForTimeout(300);
    s = await state(page);
    ok(s.focus && s.focus.status === 'done', 'timer completes');
    const logged = s.tasks.find((x) => x.id === s.focus.tid);
    ok(logged.focusMin === 15 && Object.values(logged.fl)[0] === 15, 'focusMin logged on the task');
    ok(/15 min logged/.test(await page.locator('#focusBar').innerText()), 'visible completion alert');
    await page.click('[data-fdismiss]');
    eq((await state(page)).focus, null, 'dismiss clears the bar');
    // finish early logs elapsed whole minutes only
    await page.locator('#tasks .fbtn').first().click();
    await page.click('#focForm button[type=submit]');
    await page.evaluate(() => { const S = JSON.parse(localStorage.getItem('planner.v1')); S.focus.start = Date.now() - 7.5 * 60000; localStorage.setItem('planner.v1', JSON.stringify(S)); });
    await page.reload();
    await page.click('[data-ffinish]');
    s = await state(page);
    eq(s.tasks.reduce((a, x) => a + (x.focusMin || 0), 0), 22, 'early finish logged 7 more minutes');

    // ----- review
    await gotoView(page, 'review');
    const body = await page.locator('#main').innerText();
    ok(/Weekly review/.test(body), 'review renders');
    ok(/Focus time/.test(body) && /22 min/.test(body), 'daily focus total shown');
    ok(/Done thing/.test(body) || /No completed/.test(body) === false, 'completed task listed');
    ok(await page.locator('.bars .bar-c').count() === 7, 'seven P&L bars');
    ok(await noHScroll(page), 'review: no horizontal scroll');
    await page.fill('[data-rf=well]', 'Stuck to the plan');
    await page.fill('[data-rf=fix]', 'Stop moving stops');
    await page.fill('[data-rp="0"]', 'Ship planner');
    await page.fill('[data-rp="1"]', 'Review fills');
    await page.click('[data-rvnav="last"]');
    await page.waitForTimeout(100);
    await page.click('[data-rvnav="cur"]');
    s = await state(page);
    const cur = s.reviews[0];
    ok(cur && cur.well === 'Stuck to the plan' && cur.fix === 'Stop moving stops', 'well / fix saved per week');
    eq(cur.prios, ['Ship planner', 'Review fills', ''], 'priorities saved');
    eq(await page.inputValue('[data-rf=well]'), 'Stuck to the plan', 'text restored on return');
    await page.screenshot({ path: `${SHOTS}/review-${size}.png`, fullPage: true });
    await page.click('[data-rvmake]');
    await page.waitForTimeout(150);
    s = await state(page);
    const made = s.tasks.filter((x) => x.rv);
    eq(made.map((x) => x.title), ['Ship planner', 'Review fills'], 'priorities became tasks');
    ok(made.every((x) => x.p === 3 && new Date(x.date + 'T00:00').getDay() === 1 && x.date > info.today), 'high priority, next Monday');
    await page.click('[data-rvmake]');
    ok(await page.locator('#askDlg[open]').count() === 1, 'creating twice asks first');
    await page.click('#askNo');
    await page.reload();
    eq((await state(page)).reviews[0].prios[0], 'Ship planner', 'review persists');
    // last week: no crash, nav works
    await page.click('[data-rvnav="-1"]');
    ok(/Weekly review/.test(await page.locator('#main').innerText()), 'prev week renders');
    eq(errors, [], 'no page errors');
  }
});
