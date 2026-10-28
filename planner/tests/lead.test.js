const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.goto(URL); await wait(5000);
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1') || '{}'));
  const day = (o) => { const d = new Date(); d.setDate(d.getDate() + o); const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  // trading card
  ok(await p.isVisible('#trade') && (await p.locator('#trade .acct').count()) >= 2, 'trading card with accounts');
  ok(/to go/.test(await p.textContent('#trade')) && /Bot (not )?running/.test(await p.textContent('#trade')), 'trading card text');
  await p.screenshot({ path: 'shots/L-trade.png' });
  // seed data for tomorrow
  const T = day(1);
  await p.evaluate(({ T, Y }) => {
    const s = JSON.parse(localStorage.getItem('planner.v1') || '{}');
    const ev = (id, title, date, start, end, x = {}) => ({ id, title, cat: 'trading', date, allDay: false, start, end, endDate: '', repeat: 'none', until: '', notes: '', ex: [], ...x });
    s.events = [ev('e1', 'Standup', T, '10:00', '11:00'), ev('e2', 'Daily review', T, '15:00', '15:30', { repeat: 'daily' }), ev('e3', 'Lunch', T, '12:00', '13:00')];
    s.tasks = [
      { id: 'tk1', title: 'Overdue thing', date: Y, done: false, p: 2, est: 60, created: 1, proj: 'nq' },
      { id: 'tk2', title: 'Undated high', date: '', done: false, p: 3, est: 90, created: 2, proj: 'kalshi' },
      { id: 'tk3', title: 'Undated low', date: '', done: false, p: 0, created: 3 },
    ];
    s.view = 'week'; localStorage.setItem('planner.v1', JSON.stringify(s));
  }, { T, Y: day(-1) });
  await p.reload(); await wait(800);
  // go to tomorrow in week view
  await p.evaluate((T) => { document.querySelector(`#mini [data-date="${T}"]`).click(); }, T); await wait(300);
  await p.click('#views [data-v=week]'); await wait(300);
  const blk = p.locator(`.tg-col[data-date="${T}"] .blk[data-ev=e1]`);
  const box = await blk.boundingBox();
  // mouse drag down 2h (96px)
  await p.mouse.move(box.x + box.width / 2, box.y + 12); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2, box.y + 60, { steps: 5 }); await p.mouse.move(box.x + box.width / 2, box.y + 12 + 96, { steps: 5 }); await p.mouse.up(); await wait(300);
  let e1 = (await st()).events.find((e) => e.id === 'e1');
  ok(e1.start === '12:00' && e1.end === '13:00', 'mouse drag moved to 12:00: ' + e1.start + '-' + e1.end);
  ok(!(await p.isVisible('#evDlg')), 'drag did not open the editor');
  // resize +1h
  const blk2 = p.locator(`.tg-col[data-date="${T}"] .blk[data-ev=e1]`); const b2 = await blk2.boundingBox();
  await p.mouse.move(b2.x + b2.width / 2, b2.y + b2.height - 4); await p.mouse.down(); await p.mouse.move(b2.x + b2.width / 2, b2.y + b2.height + 20, { steps: 4 }); await p.mouse.move(b2.x + b2.width / 2, b2.y + b2.height - 4 + 48, { steps: 4 }); await p.mouse.up(); await wait(300);
  e1 = (await st()).events.find((e) => e.id === 'e1'); ok(e1.start === '12:00' && e1.end === '14:00', 'resize to 14:00: ' + e1.start + '-' + e1.end);
  // drag to next day column
  const col2 = await p.locator(`.tg-col[data-date="${day(2)}"]`).boundingBox(); const b3 = await p.locator(`.tg-col[data-date="${T}"] .blk[data-ev=e1]`).boundingBox();
  await p.mouse.move(b3.x + b3.width / 2, b3.y + 15); await p.mouse.down(); await p.mouse.move(b3.x + b3.width / 2 + 40, b3.y + 20, { steps: 4 }); await p.mouse.move(col2.x + col2.width / 2, b3.y + 15, { steps: 6 }); await p.mouse.up(); await wait(300);
  e1 = (await st()).events.find((e) => e.id === 'e1'); ok(e1.date === day(2), 'moved across days: ' + e1.date);
  // recurring event: only time changes
  const b4 = await p.locator(`.tg-col[data-date="${T}"] .blk[data-ev=e2]`).boundingBox();
  await p.mouse.move(b4.x + 30, b4.y + 8); await p.mouse.down(); await p.mouse.move(b4.x + 30, b4.y + 30, { steps: 4 }); await p.mouse.move(b4.x + 30 + 140, b4.y + 8 + 48, { steps: 6 }); await p.mouse.up(); await wait(300);
  const e2 = (await st()).events.find((e) => e.id === 'e2'); ok(e2.date === (await st()).events.find((e) => e.id === 'e2').date && e2.start === '16:00' && e2.repeat === 'daily', 'recurring: time only ' + JSON.stringify([e2.date, e2.start]));
  // touch long-press drag via synthetic pointer events
  const b5 = await p.locator(`.tg-col[data-date="${T}"] .blk[data-ev=e3]`).boundingBox();
  await p.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); const o = { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y }; el.dispatchEvent(new PointerEvent('pointerdown', o)); }, { x: b5.x + 20, y: b5.y + 10 });
  await wait(480);
  await p.evaluate(({ x, y }) => { const o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y }; document.dispatchEvent(new PointerEvent('pointermove', o)); document.dispatchEvent(new PointerEvent('pointerup', o)); }, { x: b5.x + 20, y: b5.y + 10 + 48 });
  await wait(300);
  const e3 = (await st()).events.find((e) => e.id === 'e3'); ok(e3.start === '13:00', 'touch long-press drag: ' + e3.start);
  // touch scroll must not drag (moves before long-press)
  const b6 = await p.locator(`.tg-col[data-date="${T}"] .blk[data-ev=e3]`).boundingBox();
  await p.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8, pointerType: 'touch', clientX: x, clientY: y })); document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 8, pointerType: 'touch', clientX: x, clientY: y + 40 })); document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 8, pointerType: 'touch', clientX: x, clientY: y + 40 })); }, { x: b6.x + 20, y: b6.y + 10 });
  await wait(600); ok((await st()).events.find((e) => e.id === 'e3').start === '13:00', 'scroll gesture did not move event');
  // Plan my day (tomorrow)
  await p.click('#planGoBtn'); await wait(300);
  ok(await p.isVisible('#planDlg') && (await p.locator('#planPick .pp').count()) === 3, 'plan dialog lists 3 tasks: ' + await p.locator('#planPick .pp').count());
  const first = await p.locator('#planPick .pp').first().textContent(); ok(/Overdue thing/.test(first), 'overdue first: ' + first);
  await p.screenshot({ path: 'shots/L-plan.png' });
  await p.locator('#planPick .pp', { hasText: 'Undated high' }).locator('input').check(); // on by default (p3)
  await p.click('#planGo'); await wait(500);
  const s1 = await st(); const t1 = s1.tasks.find((t) => t.id === 'tk1'), t2 = s1.tasks.find((t) => t.id === 'tk2');
  ok(t1.date === T && t2.date === T && t2.p === 3, 'tasks moved to the planned day');
  const blocks = s1.events.filter((e) => e.taskId); ok(blocks.length === 2, 'two time blocks: ' + blocks.length);
  const busy = s1.events.filter((e) => e.date === T && !e.taskId).map((e) => [e.start, e.end]);
  const overlap = blocks.some((bk) => s1.events.filter((e) => e.date === T && e.id !== bk.id).some((o) => o.start < bk.end && bk.start < o.end));
  ok(!overlap, 'blocks do not overlap anything: ' + JSON.stringify(s1.events.filter((e) => e.date === T).map((e) => [e.title, e.start, e.end])));
  ok(s1.planned === T, 'planned flag');
  // task details
  await p.fill('#taskIn', 'Write case study'); await p.press('#taskIn', 'Enter'); await wait(200);
  await p.locator('#tasks li', { hasText: 'Write case study' }).locator('[data-tdetail]').first().click();
  ok(await p.isVisible('#taskDlg'), 'task dialog opens');
  await p.fill('#tSubIn', 'Outline'); await p.press('#tSubIn', 'Enter'); await p.fill('#tSubIn', 'Draft'); await p.press('#tSubIn', 'Enter');
  await p.locator('#tSubs li').first().locator('input[type=checkbox]').check();
  await p.selectOption('#tEst', '60'); await p.fill('#tNotes', 'for portfolio'); await p.selectOption('#tProj', 'portfolio');
  await p.screenshot({ path: 'shots/L-task.png' });
  await p.click('#taskForm2 button[type=submit]'); await wait(300);
  const tk = (await st()).tasks.find((t) => t.title === 'Write case study');
  ok(tk.sub.length === 2 && tk.sub[0].d && !tk.sub[1].d && tk.est === 60 && tk.proj === 'portfolio' && tk.notes === 'for portfolio', 'task details saved ' + JSON.stringify(tk));
  ok(/1\/2 steps/.test(await p.textContent('#tasks')), 'steps chip');
  // block time from task, then complete task from event
  await p.locator('#tasks li', { hasText: 'Write case study' }).locator('[data-tdetail]').first().click(); await p.click('#tBlock'); await wait(200);
  ok(await p.isVisible('#blockDlg') && (await p.locator('#bGaps button').count()) >= 1, 'block dialog with gaps');
  await p.click('#blockForm button[type=submit]'); await wait(400);
  const bev = (await st()).events.find((e) => e.taskId === tk.id); ok(bev && bev.start && bev.end, 'task time-blocked');
  await p.click(`.blk[data-ev="${bev.id}"]`); await wait(200);
  ok(await p.isVisible('#fTaskDone'), 'mark task done button'); await p.click('#fTaskDone'); await wait(300);
  ok((await st()).tasks.find((t) => t.id === tk.id).done, 'task marked done from event');
  // deep links
  await p.goto(URL + '#new-event'); await wait(900); ok(await p.isVisible('#evDlg'), '#new-event opens editor'); await p.keyboard.press('Escape');
  await p.goto(URL + '#plan'); await wait(900); ok(await p.isVisible('#planDlg'), '#plan opens plan'); 
  await p.goto(URL + '#projects'); await wait(900); ok(await p.locator('.pc').count() === 5, '#projects opens projects');
  // phone
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); m.on('pageerror', (e) => errs.push('m ' + e.message));
  await m.goto(URL); await wait(5000);
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'phone overflow');
  await m.screenshot({ path: 'shots/L-phone.png', fullPage: false });
  await m.click('#planGoBtn'); await wait(300); await m.screenshot({ path: 'shots/L-phone-plan.png' });
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'phone overflow with plan dialog');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'LEAD OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
