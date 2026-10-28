// Pre-trade checklist: rules, run the checklist, status in the plan card and Now bar, streak, 4-week grid, Review card.
// Run: node planner/tests/rules.test.js   (opens planner/index.html from disk; no dashboard data needed)
const { open, state, noHScroll, gotoView, run, ok, eq, SHOTS } = require('./lib');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWk = (d) => d.getDay() > 0 && d.getDay() < 6;

run('rules', async (browser) => {
  for (const size of ['phone', 'desktop']) {
    console.log(' ' + size);
    const { page, errors } = await open(browser, size);
    const today = new Date(), weekday = isWk(today);
    await gotoView(page, 'rules');
    ok(await page.isVisible('text=No rules yet'), 'empty state shown');
    ok(await page.isDisabled('main [data-rlrun]'), 'Run is disabled until a rule exists');

    // suggestions add rules in one tap
    await page.click('[data-rlsug="Risk is within plan"]');
    await page.click('[data-rlsug="No revenge trade after a loss"]');
    await page.click('[data-rlsug="Trading inside my killzones only"]');
    let s = await state(page);
    eq(s.rules.map((r) => r.name).sort(), ['No revenge trade after a loss', 'Risk is within plan', 'Trading inside my killzones only'], 'three suggested rules saved');
    ok(s.rules.every((r) => typeof r.id === 'string' && r.u), 'rules have id and timestamp');

    // a custom rule through the dialog
    await page.click('#rlNew');
    await page.click('#rlForm button[type=submit]');
    ok(await page.isVisible('#rlErr'), 'empty rule is refused');
    await page.fill('#rlName', 'Max two trades');
    await page.fill('#rlNote', 'Stop after the second one');
    await page.click('#rlForm button[type=submit]');
    s = await state(page);
    eq(s.rules.length, 4, 'custom rule saved');
    ok(await noHScroll(page), 'rules view: no horizontal scroll');

    // run the checklist: must answer every rule
    await page.click('main [data-rlrun]');
    ok(await page.isVisible('#ckDlg'), 'checklist sheet opens');
    const box = await page.locator('.ck-b').first().boundingBox();
    ok(box.height >= 44, 'yes/no buttons are big tap targets (' + box.height + 'px)');
    await page.click('#ckForm button[type=submit]');
    ok(await page.isVisible('#ckErr'), 'saving with unanswered rules is refused');
    const rows = await page.locator('.ck-r').count();
    for (let i = 0; i < rows; i++) await page.locator('.ck-r').nth(i).locator('.ck-b.yes').click();
    await page.locator('.ck-r').nth(1).locator('.ck-b.no').click();
    await page.screenshot({ path: `${SHOTS}/rules-sheet-${size}.png` });
    await page.click('#ckForm button[type=submit]');
    await page.waitForTimeout(100);
    s = await state(page);
    const key = 'c:' + ymd(today);
    const c = s.checks.find((x) => x.id === key);
    ok(!!c && c.items.length === 4, 'check saved as ' + key);
    eq(c.items.filter((i) => !i.y).length, 1, 'one rule marked broken');
    ok(c.items.every((i) => i.n && i.id), 'items keep the rule name');

    // status in the plan card (sidebar) and, on a phone, the Now bar
    const chip = await page.textContent('#rulesChip');
    if (weekday) ok(/Checklist done today/.test(chip) && /3 of 4/.test(chip), 'plan-card status says done: ' + chip.trim());

    // fix it: edit to all yes -> streak 1
    await page.click('main [data-rlrun]');
    for (let i = 0; i < rows; i++) await page.locator('.ck-r').nth(i).locator('.ck-b.yes').click();
    await page.click('#ckForm button[type=submit]');
    await page.waitForTimeout(100);
    s = await state(page);
    eq(s.checks.length, 1, 'editing the same day does not create a second check');
    ok(s.checks[0].items.every((i) => i.y), 'all rules now followed');
    ok((await page.textContent('main .rl-stat')).includes('1') || !weekday, 'streak shows 1');

    // streak across days: seed the previous two trading days as fully followed, one earlier broken
    await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('planner.v1')), pad = (n) => String(n).padStart(2, '0');
      const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const d = new Date(); let n = 0; const days = [];
      while (days.length < 3) { d.setDate(d.getDate() - 1); if (d.getDay() > 0 && d.getDay() < 6) days.push(ymd(d)); n++; }
      const mk = (date, y) => ({ id: 'c:' + date, date, items: st.rules.map((r) => ({ id: r.id, n: r.name, y })), u: Date.now() });
      st.checks.push(mk(days[0], true), mk(days[1], true), mk(days[2], false));
      localStorage.setItem('planner.v1', JSON.stringify(st));
    });
    await page.reload();
    await gotoView(page, 'rules');
    const stat = await page.textContent('main .rl-stat');
    if (weekday) ok(/^\s*3/.test(stat), 'streak counts 3 consecutive fully followed trading days: ' + stat.trim().slice(0, 40));
    ok(await page.locator('.rl-d.full').count() >= 3, '4-week grid shows followed days');
    ok(await page.locator('.rl-d.part').count() >= 1, '4-week grid shows the broken day');
    ok(await noHScroll(page), 'rules view with history: no horizontal scroll');
    await page.screenshot({ path: `${SHOTS}/rules-view-${size}.png`, fullPage: false });

    // Review card
    await gotoView(page, 'review');
    const rv = await page.textContent('main');
    ok(/Pre-trade checklist, last 7 days/.test(rv), 'Review shows the last-7-days card');
    ok(await noHScroll(page), 'review: no horizontal scroll');

    // Now bar on a phone when not done: remove today's check
    if (size === 'phone' && weekday) {
      await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('planner.v1')), d = new Date(), pad = (n) => String(n).padStart(2, '0'); const k = `c:${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; st.checks = st.checks.filter((c) => c.id !== k); localStorage.setItem('planner.v1', JSON.stringify(st)); });
      await page.reload();
      const nb = await page.textContent('#nowbar');
      ok(/Checklist not done today/.test(nb), 'Now bar reminds when not done');
      await page.click('#nowbar [data-nowrules]');
      ok(await page.isVisible('#ckDlg'), 'tapping the reminder opens the sheet');
      await page.screenshot({ path: `${SHOTS}/rules-nowbar-${size}.png`, clip: { x: 0, y: 0, width: 390, height: 420 } });
      await page.keyboard.press('Escape');
    }

    // delete a rule (in-page confirm)
    await gotoView(page, 'rules');
    await page.locator('[data-rledit]').first().click();
    await page.click('#rlDel');
    await page.click('#askYes');
    await page.waitForTimeout(300);
    s = await state(page);
    eq(s.rules.length, 3, 'rule deleted');
    ok(s.deleted && Object.keys(s.deleted).length >= 1, 'deletion tombstoned for sync');
    await page.reload();
    eq((await state(page)).rules.length, 3, 'persisted after reload');
    eq(errors, [], 'no page errors');
  }
});
