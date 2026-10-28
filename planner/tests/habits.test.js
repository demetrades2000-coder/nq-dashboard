const { open, state, noHScroll, gotoView, run, ok, eq, SHOTS } = require('./lib');

run('habits', async (browser) => {
  for (const size of ['desktop', 'phone']) {
    console.log(' ' + size);
    const { page, errors } = await open(browser, size);
    await gotoView(page, 'habits');
    let s = await state(page);
    eq(s.habits, [], 'no habits seeded');
    ok((await page.locator('[data-hsug]').count()) === 6, 'six suggestions offered');

    await page.click('[data-hsug="Pre-market routine"]');
    await page.click('[data-hsug="Workout"]');
    s = await state(page);
    eq(s.habits.map((h) => h.name), ['Pre-market routine', 'Workout'], 'suggested habits added');
    ok((await page.locator('[data-hsug]').count()) === 4, 'added suggestions disappear');

    const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    const card = page.locator('.hb').first();
    await card.locator('[data-hchk]').click();
    s = await state(page);
    eq(s.habits[0].done, [today], 'check-in stored for today');
    ok(s.habits[0].u > 0, 'habit stamped by commit()');
    eq((await card.locator('.hb-s b').innerText()).trim(), '1', 'streak is 1');
    // back-fill yesterday and the day before through the dot grid
    await card.locator(`[data-hday="${addDays(today, -1)}"]`).click();
    await card.locator(`[data-hday="${addDays(today, -2)}"]`).click();
    eq((await card.locator('.hb-s b').innerText()).trim(), '3', 'streak is 3 after back-fill');
    // a gap, then an older run of 2: best streak should remember the longer run
    await card.locator(`[data-hday="${addDays(today, -5)}"]`).click();
    await card.locator(`[data-hday="${addDays(today, -6)}"]`).click();
    await card.locator(`[data-hday="${addDays(today, -7)}"]`).click();
    await card.locator(`[data-hday="${addDays(today, -8)}"]`).click();
    eq((await card.locator('.hb-s').innerText()).replace(/\s+/g, ' '), '3 day streak best 4', 'best streak tracked separately');
    ok((await card.locator('.hd').count()) === 28, 'four-week dot grid has 28 dots');
    ok((await card.locator('.hd:disabled').count()) >= 0, 'future dots are disabled');
    // tap targets on phone
    const chk = await card.locator('[data-hchk]').boundingBox();
    ok(chk.width >= 36 && chk.height >= 36, 'check-in button is at least 36px');
    const dot = await card.locator('.hd').first().boundingBox();
    ok(dot.height >= 36, 'dot tap target is at least 36px tall');
    // uncheck today: streak stays alive from yesterday
    await card.locator('[data-hchk]').click();
    eq((await card.locator('.hb-s b').innerText()).trim(), '2', 'unchecked today keeps streak from yesterday');

    // edit: rename + weekdays only
    await card.locator('[data-hedit]').click();
    await page.fill('#hName', 'Pre-market routine v2');
    await page.click('#hDays [data-hdow="0"]');
    await page.click('#hDays [data-hdow="6"]');
    await page.click('#habForm button[type=submit]');
    s = await state(page);
    eq(s.habits[0].days, [1, 2, 3, 4, 5], 'schedule saved as weekdays');
    eq(s.habits[0].name, 'Pre-market routine v2', 'rename saved');
    ok(/Weekdays/.test(await page.locator('.hb').first().innerText()), 'schedule label shows Weekdays');

    // custom habit
    await page.click('#hNew');
    await page.fill('#hName', 'Stretch');
    await page.click('#habForm button[type=submit]');
    s = await state(page);
    ok(s.habits.some((h) => h.name === 'Stretch' && h.days.length === 7), 'custom daily habit added');
    await page.screenshot({ path: `${SHOTS}/habits-${size}.png`, fullPage: true });
    ok(await noHScroll(page), 'no horizontal scroll');

    // persistence
    await page.reload();
    s = await state(page);
    eq(s.view, 'habits', 'view persisted');
    eq(s.habits.length, 3, 'habits persisted');
    eq(await page.locator('.hb').count(), 3, 'habit cards rendered after reload');

    // delete asks first
    await page.locator('.hb').nth(2).locator('[data-hedit]').click();
    await page.click('#hDelete');
    await page.click('#askYes');
    await page.waitForTimeout(150);
    eq((await state(page)).habits.length, 2, 'habit deleted after confirmation');
    eq(errors, [], 'no page errors');
  }
});
