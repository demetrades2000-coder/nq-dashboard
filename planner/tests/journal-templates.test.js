const { open, state, noHScroll, gotoView, run, ok, eq, SHOTS } = require('./lib');

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

run('journal + templates', async (browser) => {
  for (const size of ['desktop', 'phone']) {
    console.log(' ' + size);
    const t = await page0(browser, size);
    const { page, errors } = t;
    const day = await page.evaluate(today);
    // seed bot P&L for today in the planner.nq cache (what loadNq writes)
    await page.evaluate((d) => { localStorage.setItem('planner.nq', JSON.stringify({ t: Date.now(), doc: { bot: 'NQ bots', events: [] }, pnl: { [d]: 412.5 } })); }, day);
    await page.reload();

    // ----- journal (sidebar card)
    await page.click('#jrnSide [data-jtoggle]');
    ok(/\+\$413/.test(await page.locator('#jrnSide').innerText()), 'bot P&L shown read-only');
    await page.fill('#jrnSide [data-jf=note]', 'Took the 9:40 sweep, held to target.');
    await page.click('#jrnSide [data-jmood="4"]');
    await page.click('#jrnSide [data-jrules="partly"]');
    await page.click('body', { position: { x: 5, y: 5 } });
    await page.waitForTimeout(1200);
    let s = await state(page);
    eq(s.journal.length, 1, 'one journal entry');
    const j = s.journal[0];
    ok(j.date === day && j.mood === 4 && j.rules === 'partly' && /sweep/.test(j.note), 'journal fields saved');
    await page.reload();
    ok(/Mood 4\/5/.test(await page.locator('#jrnSide').innerText()), 'journal summary persists after reload');
    // toggle off clears
    await page.click('#jrnSide [data-jmood="4"]');
    eq((await state(page)).journal[0].mood, 0, 'tapping the same mood clears it');

    // ----- journal in the Day view
    await gotoView(page, 'day');
    ok((await page.locator('#jrnDay').count()) === 1, 'Day view has a journal strip');
    await page.click('#jrnDay [data-jtoggle]');
    ok((await page.locator('#jrnDay textarea').inputValue()).includes('sweep'), 'Day strip shows the same note');
    await page.fill('#jrnDay textarea', 'edited in day view');
    await page.click('#jrnDay [data-jrules="yes"]');
    await page.waitForTimeout(200);
    s = await state(page);
    ok(s.journal[0].note === 'edited in day view' && s.journal[0].rules === 'yes', 'edit from Day view saved');
    ok(await noHScroll(page), 'no horizontal scroll with journal open');
    await page.screenshot({ path: `${SHOTS}/journal-${size}.png` });

    // ----- templates
    await gotoView(page, 'month');
    await page.click('#tplApply');
    await page.waitForTimeout(300);
    s = await state(page);
    const made = s.events.filter((e) => e.tpl === 'tpl-trading');
    eq(made.map((e) => e.start + '-' + e.end).sort(), ['08:30-09:00', '09:30-11:30', '12:00-12:30', '16:15-16:45'], 'default template creates the four events');
    ok(made.every((e) => e.date === day), 'events land on the selected day');
    // second apply warns
    await page.click('#tplApply');
    ok(await page.locator('#askDlg[open]').count() === 1, 'second apply asks before duplicating');
    await page.click('#askNo');
    eq((await state(page)).events.length, 4, 'cancel adds nothing');
    await page.click('#tplApply');
    await page.click('#askYes');
    await page.waitForTimeout(300);
    eq((await state(page)).events.length, 8, 'confirmed apply adds again');

    // save the day as a new template (add a task first)
    await page.fill('#taskIn', 'Check calendar for news');
    await page.press('#taskIn', 'Enter');
    await page.click('#tplManage');
    await page.fill('#tplName', 'My day');
    await page.click('#tplNew button');
    s = await state(page);
    const mine = s.templates.find((x) => x.name === 'My day');
    ok(mine && mine.events.length === 8 && mine.tasks.length === 1, 'save day as template captures events and tasks');
    ok(await noHScroll(page), 'no horizontal scroll with template dialog');
    await page.screenshot({ path: `${SHOTS}/templates-${size}.png` });
    // rename, remove an item, delete
    const card = page.locator('#tplList [data-tid]').nth(1);
    await card.locator('[data-tname]').fill('Renamed');
    await card.locator('[data-tname]').press('Tab');
    await card.locator('[data-trm="t"]').click();
    s = await state(page);
    const r = s.templates.find((x) => x.name === 'Renamed');
    ok(r && r.tasks.length === 0, 'rename + remove item saved');
    await page.locator('#tplList [data-tid]').nth(0).locator('[data-tdel2]').click();
    await page.click('#askYes');
    await page.waitForTimeout(300);
    s = await state(page);
    ok(!s.templates.some((x) => x.id === 'tpl-trading'), 'default template can be deleted');
    await page.reload();
    ok(!(await state(page)).templates.some((x) => x.id === 'tpl-trading'), 'deleted default is not re-seeded');
    eq(errors, [], 'no page errors');
  }
});
async function page0(browser, size) { return open(browser, size); }
