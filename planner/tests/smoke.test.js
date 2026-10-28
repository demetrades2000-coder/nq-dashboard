// Existing behavior still works: add an event through the dialog, add a task, visit every view, no page errors.
const { open, state, noHScroll, gotoView, run, ok, eq, SHOTS } = require('./lib');

run('smoke', async (browser) => {
  for (const size of ['desktop', 'phone']) {
    console.log(' ' + size);
    const { page, errors } = await open(browser, size);
    await page.click('#newBtn');
    await page.fill('#fTitle', 'Smoke event');
    await page.click('#fSave');
    await page.waitForTimeout(100);
    await page.fill('#taskIn', 'Smoke task #nq');
    await page.press('#taskIn', 'Enter');
    await page.waitForTimeout(100);
    let s = await state(page);
    eq(s.events.map((e) => e.title), ['Smoke event'], 'event saved');
    eq(s.tasks.map((t) => t.title), ['Smoke task'], 'task saved');
    ok(s.tasks[0].proj === 'nq', 'task tagged with project');
    ok(Array.isArray(s.habits) && Array.isArray(s.journal) && Array.isArray(s.reviews), 'new collections exist');
    eq(s.templates.map((t) => t.name), ['Trading day'], 'default template shipped');
    for (const v of ['month', 'week', 'day', 'agenda', 'projects', 'habits', 'review']) {
      await gotoView(page, v);
      ok((await state(page)).view === v, `view ${v} opens`);
      ok(await noHScroll(page), `${v}: no horizontal scroll`);
    }
    await page.reload();
    s = await state(page);
    eq(s.events.length, 1, 'persisted after reload');
    eq(errors, [], 'no page errors');
    await page.screenshot({ path: `${SHOTS}/smoke-${size}.png` });
  }
});
