// Shared helpers for the planner tests. Run any test with: node planner/tests/<name>.test.js
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log('  ok   ' + msg);
  else { failures++; console.log('  FAIL ' + msg); }
}
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

async function open(browser, size, init) {
  const ctx = await browser.newContext({ viewport: SIZES[size], hasTouch: size === 'phone', isMobile: size === 'phone' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForSelector('#main');
  return { ctx, page, errors };
}
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// Switch view the way a user would: tab button on desktop, More menu on phone.
async function gotoView(page, v) {
  const inline = await page.locator(`#views > [data-v="${v}"]`).isVisible();
  if (inline) await page.click(`#views > [data-v="${v}"]`);
  else { await page.click('#moreBtn'); await page.click(`#moreMenu [data-v="${v}"]`); }
  await page.waitForTimeout(60);
}
async function run(name, fn) {
  console.log(name);
  const browser = await chromium.launch();
  try { await fn(browser); } catch (e) { failures++; console.log('  FAIL threw: ' + (e && e.stack || e)); }
  await browser.close();
  console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
  process.exit(failures ? 1 : 0);
}
module.exports = { open, state, noHScroll, gotoView, run, ok, eq, SHOTS, SIZES };
