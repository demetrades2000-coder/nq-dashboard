const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8777/nq-dashboard/planner/index.html';
const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(b, tz) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: tz });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(tz + ' pageerror ' + e.message));
  await p.goto(URL); await wait(5500);
  const ev = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.nq')).doc);
  const doc = await ev();
  const lay = (id) => doc.events.filter((e) => e.layer === id).length;
  ok(lay('high') >= 3 && lay('med') >= 4 && lay('low') >= 2 && lay('earn') >= 1, `${tz} layer counts high=${lay('high')} med=${lay('med')} low=${lay('low')} earn=${lay('earn')}`);
  ok((await p.locator('#layers [data-layer]').count()) === 5, 'layers chips');
  // week of Oct 25-31 (data week)
  await p.evaluate(() => document.querySelector('#mini [data-date="2026-10-29"]').click()); await wait(300);
  await p.click('#views [data-v=week]'); await wait(400);
  // Core PCE / GDP 08:30 ET on Thu 10-29 -> local
  const want = tz === 'America/New_York' ? '8:30am' : tz === 'America/Los_Angeles' ? '5:30am' : '12:30pm';
  const blk = p.locator('.tg-col[data-date="2026-10-29"] .blk', { hasText: 'Core PCE' });
  ok(await blk.count() === 1 && (await blk.textContent()).includes(want), `${tz}: Core PCE shows at ${want}: ` + (await blk.count() ? await blk.textContent() : 'missing'));
  // medium visible, low hidden by default, low appears when toggled
  ok(await p.locator('.tg-col[data-date="2026-10-30"] .blk', { hasText: 'Employment Cost' }).count() === 1, 'medium event visible');
  ok(await p.locator('.tg-col[data-date="2026-10-30"] .blk', { hasText: 'Daly' }).count() === 0, 'low hidden by default');
  await p.click('#layers [data-layer=low]'); await wait(300);
  ok(await p.locator('.tg-col[data-date="2026-10-30"] .blk', { hasText: 'Daly' }).count() === 1, 'low shows when toggled');
  await p.click('#layers [data-layer=med]'); await wait(300);
  ok(await p.locator('.tg-col[data-date="2026-10-30"] .blk', { hasText: 'Employment Cost' }).count() === 0, 'medium hides when toggled');
  await p.click('#layers [data-layer=med]'); await p.click('#layers [data-layer=low]');
  // session bands: NY AM begins 09:30 ET
  const top = await p.locator('.tg-col[data-date="2026-10-29"] .s-kz').first().evaluate((el) => parseFloat(el.style.top));
  const wantTop = (tz === 'America/New_York' ? 9.5 : tz === 'America/Los_Angeles' ? 6.5 : 13.5) * 48;
  ok(Math.abs(top - wantTop) < 1, `${tz}: NY AM band top ${top} want ${wantTop}`);
  ok(await p.locator('.tg-col[data-date="2026-10-31"] .sess').count() === 0, 'no session bands on Saturday');
  await p.click('#layers [data-layer=sess]'); await wait(200); ok(await p.locator('.sess').count() === 0, 'sessions toggle off'); await p.click('#layers [data-layer=sess]');
  // news view
  await p.click('#views [data-v=news]'); await wait(400);
  ok(await p.locator('.nw-row').count() >= 5, 'news rows ' + await p.locator('.nw-row').count());
  ok(await p.locator('.hl').count() >= 10, 'headlines');
  ok(await p.locator('a.hl[target=_blank]').count() >= 5, 'headline links open in new tab');
  ok(await p.isVisible('.nw-warn'), 'stale warning shown for old data');
  ok(/Core PCE/.test(await p.textContent('.news')) && new RegExp(want).test(await p.textContent('.news')), `${tz} news view time ${want}`);
  await p.click('#newsImp [data-i=high]'); await wait(200); const nHigh = await p.locator('.nw-row').count();
  await p.click('#newsImp [data-i=all]'); await wait(200); ok(await p.locator('.nw-row').count() > nHigh, 'impact filter');
  ok(/Market times/.test(await p.textContent('#mkt')), 'market times card');
  if (tz === 'America/New_York') await p.screenshot({ path: 'shots/NW-desktop.png' });
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  for (const tz of ['America/New_York', 'America/Los_Angeles', 'Europe/London']) await run(b, tz);
  // phone
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'America/New_York' })).newPage(); m.on('pageerror', (e) => errs.push('m ' + e.message));
  await m.goto(URL); await wait(5500); await m.click('#moreBtn'); await m.click('#moreMenu [data-v=news]'); await wait(400);
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'phone overflow in news');
  await m.screenshot({ path: 'shots/NW-phone.png' });
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'NEWS OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
