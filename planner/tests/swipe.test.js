const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.goto(URL); await wait(4000);
  const title0 = await p.textContent('#title');
  const swipe = (dx) => p.evaluate((dx) => { const el = document.querySelector('.m-g'); const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); const t0 = mk(250, 400), t1 = mk(250 + dx, 410);
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t0], targetTouches: [t0], changedTouches: [t0] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], targetTouches: [], changedTouches: [t1] })); }, dx);
  await swipe(-150); await wait(200); const title1 = await p.textContent('#title'); ok(title1 !== title0, 'swipe left goes next month: ' + title0 + ' -> ' + title1);
  await swipe(150); await wait(200); ok(await p.textContent('#title') === title0, 'swipe right goes back');
  await swipe(40); await wait(100); ok(await p.textContent('#title') === title0, 'short swipe ignored');
  // search tasks
  await p.fill('#taskIn', 'Unique zebra task'); await p.press('#taskIn', 'Enter'); await wait(200);
  await p.fill('#q', 'zebra'); await wait(300); ok(await p.locator('#main .tasks li').count() === 1, 'search finds task');
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'SWIPE OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
