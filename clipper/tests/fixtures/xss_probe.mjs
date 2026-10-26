// Opens the dashboard in headless Chromium, walks every page and opens the clip sheets, and reports whether any
// hostile text executed. Used by tests/test_security.py (no network: fonts and 3D layer are blocked).
//
//   node xss_probe.mjs <page url> <output json> [chromium path]
//
// Hostile strings in the data call window.__x.push('<field>') from inline handlers; if one runs, the field name shows up.
import fs from 'node:fs';

// PW_MODULE = path to playwright/index.mjs (default: the one in this sandbox); PW_CHROMIUM = browser binary (default:
// the one Playwright installed for itself)
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');

const [, , url, outFile, chromePath] = process.argv;
const exe = chromePath || process.env.PW_CHROMIUM || undefined;
const ROUTES = ['submit', 'today', 'clips', 'analytics', 'earnings', 'campaigns', 'accounts', 'jobs', 'activity', 'settings'];

const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox', '--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await ctx.route(/\/fx\.js(\?|$)/, (r) => r.abort());     // 3D layer is not needed (and WebGL is not available)
const page = await ctx.newPage();
const dialogs = [], pageErrors = [], consoleErrors = [];
page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
await page.addInitScript(() => { window.__x = []; });

const seen = new Set();
const out = { routes: {}, shown: [], executed: [], dialogs, pageErrors, badLinks: [], injectedNodes: [], booted: false };
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
out.booted = await page.evaluate(() => document.querySelectorAll('#nav a').length > 3 && !!document.querySelector('#page') && document.querySelector('#page').children.length > 0);

for (const r of ROUTES) {
  await page.evaluate((h) => { location.hash = '#/' + h; }, r);
  await page.waitForTimeout(700);
  // open up to six clip sheets / campaign buttons on this page, then close them
  const clips = await page.$$('[data-clip]');
  const grab = async () => {
    const t = await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[title],[aria-label]')].map((e) => (e.title || '') + (e.getAttribute('aria-label') || '')).join(' '));
    for (const m of t.matchAll(/push\('(\w+)'\)/g)) seen.add(m[1]);
  };
  await grab();
  for (const el of clips.slice(0, 6)) {
    try { await el.click({ timeout: 1500, force: true }); await page.waitForTimeout(250); await grab(); await page.keyboard.press('Escape'); } catch (e) { /* not clickable */ }
  }
  out.routes[r] = await page.evaluate(() => ({
    text: document.querySelector('#page')?.innerText.slice(0, 200) || '',
    imgs: [...document.querySelectorAll('#page img, .sheet img')].filter((i) => /^x$|^x\?/.test(i.getAttribute('src') || '')).length,
  }));
  const found = await page.evaluate(() => {
    const bad = [];
    for (const a of document.querySelectorAll('a[href], [src], form[action]')) {
      const v = (a.getAttribute('href') || a.getAttribute('src') || a.getAttribute('action') || '').trim().toLowerCase();
      if (/^(javascript|vbscript|data):/.test(v) && !/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64/.test(v)) bad.push(v.slice(0, 80));
    }
    const nodes = [];
    for (const el of document.querySelectorAll('#page *, .sheet *, #nav *')) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' && !el.closest('svg')) nodes.push('script element');
      for (const at of el.getAttributeNames()) if (/^on/.test(at) && !/^(onerror)$/.test(at)) nodes.push(`${tag}[${at}]`);
      if (el.hasAttribute('onerror') && tag === 'img' && !(el.getAttribute('onerror') || '').includes('this.remove()')
          && !(el.getAttribute('onerror') || '').includes('LOGO_SVG') && !(el.getAttribute('onerror') || '').includes('this.parentNode')) nodes.push(`img[onerror=${el.getAttribute('onerror').slice(0, 60)}]`);
    }
    return { bad, nodes };
  });
  out.badLinks.push(...found.bad);
  out.injectedNodes.push(...found.nodes);
}
out.shown = [...seen].sort();
out.executed = await page.evaluate(() => window.__x || []);
out.consoleErrors = consoleErrors.slice(0, 10);
fs.writeFileSync(outFile, JSON.stringify(out));
await browser.close();
