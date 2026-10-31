// Dark mode, the Appearance setting and the light-mode guard: node planner/tests/theme.test.js  (serve the site first, see shifts.test.js; PORT=... overrides)
// Dark: every deep link has readable text (>= 3:1), no big white boxes, no page errors, no sideways scroll at 390px.
// Setting: the choice persists across reload, 'Match my phone' follows prefers-color-scheme, the header button flips it, the Settings sheet shows it.
// Light: computed colors of key elements are exactly what they were before dark mode existed.
const { chromium } = require('playwright');
const L = require('./lib-todayorg.js');
const { wait, open, PORT } = L;
const URL = `http://127.0.0.1:${PORT}/nq-dashboard/planner/index.html`;
const HASHES = 'shifts bills tilt trade-plan search time-audit deals edge score worth alerts miles brief payday hours availability prop business taxes tools week-balance earnings help plan meals settings appearance'.split(' ');
const TO_IDS = 'tilt guard bills deals shutdown tradeplan setup sched tasks news habits meals quick timelog brief health trading goals journal earn wb hr score edge worth prop biz tax miles payday avail alerts'.split(' ');
const VIEWS = ['today', 'month', 'week', 'day', 'agenda', 'projects', 'health'];

// Light-mode values recorded from the app before dark mode was added (1366x800, fixed clock, the seeded state below).
const LIGHT = {
  "body": "rgb(255, 255, 255)|rgb(17, 24, 39)|rgb(17, 24, 39)",
  ".top": "rgb(255, 255, 255)|rgb(17, 24, 39)|rgb(17, 24, 39)",
  ".btn": "rgb(255, 255, 255)|rgb(17, 24, 39)|rgb(230, 232, 236)",
  ".btn.primary": "rgb(17, 24, 39)|rgb(255, 255, 255)|rgb(17, 24, 39)",
  ".side .card": "rgb(255, 255, 255)|rgb(17, 24, 39)|rgb(230, 232, 236)",
  ".seg": "rgb(241, 243, 246)|rgb(17, 24, 39)|rgb(17, 24, 39)",
  ".mini-g button.today": "rgb(17, 24, 39)|rgb(255, 255, 255)|rgb(255, 255, 255)",
  ".logo": "rgb(17, 24, 39)|rgb(255, 255, 255)|rgb(255, 255, 255)",
  ".td-card": "rgb(255, 255, 255)|rgb(17, 24, 39)|rgb(230, 232, 236)",
  ".tdy": "rgba(0, 0, 0, 0)|rgb(17, 24, 39)|rgb(17, 24, 39)",
  ".srow": "rgb(248, 240, 222)|rgb(17, 24, 39)|rgb(17, 24, 39)",
  ".tasks input[type=checkbox]": "rgba(0, 0, 0, 0)|rgb(17, 24, 39)|rgb(201, 205, 212)",
  ".search input": "rgb(255, 255, 255)|rgb(17, 24, 39)|rgb(230, 232, 236)",
  ".cats .sw": "rgb(185, 28, 28)|rgb(17, 24, 39)|rgb(185, 28, 28)",
};
const BASE_SEL = Object.keys(LIGHT);

// Runs inside the page: returns problems for the current screen.
function audit() {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] == null ? 1 : v[3] }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const page = parse(getComputedStyle(document.body).backgroundColor);
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a >= 1) break; } } let bg = chain.length && chain[chain.length - 1].a >= 1 ? chain.pop() : { ...page, a: 1 }; while (chain.length) bg = over(chain.pop(), bg); return bg; };
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .9) return false; } return true; };
  const bad = [], whites = [], seen = new Set();
  const dlg = document.querySelector('dialog[open]');
  const root = dlg || document.body; // with a sheet open, the page behind is dimmed by the backdrop
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el) || /^(SCRIPT|STYLE|OPTION)$/.test(el.tagName)) continue;
    seen.add(el);
    if (!visible(el) || el.closest('[disabled],[aria-disabled=true],.off,.dim,.out')) continue;
    const cs = getComputedStyle(el); let fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el); fg = over(fg, bg);
    const cr = ratio(fg, bg);
    if (cr < 3) bad.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? String(el.className) : '').split(' ')[0]} "${n.nodeValue.trim().slice(0, 24)}" ${cr.toFixed(2)} fg=${cs.color} bg=rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`);
  }
  root.querySelectorAll('*').forEach((el) => {
    if (/^(IMG|CANVAS|SVG|VIDEO|PATH|CIRCLE|RECT|G|LINE|POLYLINE|INPUT|DIALOG)$/i.test(el.tagName) || el.closest('svg')) return;
    const r = el.getBoundingClientRect(); if (r.width <= 40 || r.height <= 40 || !visible(el)) return;
    if (getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)') whites.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
  });
  return { bad: bad.slice(0, 12), whites: [...new Set(whites)].slice(0, 8), sideways: document.documentElement.scrollWidth > window.innerWidth + 1 || (dlg ? dlg.scrollWidth > dlg.clientWidth + 1 : false) };
}

(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const state = () => { const s = L.fullState(); s.meals = [{ id: 'ml1', date: L.TODAY, time: '08:10', slot: 'breakfast', name: 'Eggs + toast', items: [{ name: 'Eggs', qty: 2, unit: '', kcal: 180, p: 12, c: 1, f: 12 }], kcal: 420, p: 30, c: 40, f: 15, src: 'ai', note: '', thumb: '', created: 1 }]; return s; };
  const go = (p, hash) => p.goto(URL + hash).then(() => wait(800));

  // 1. dark: every deep link and every view, phone and desktop
  for (const width of [390, 1366]) {
    const { ctx, p, errs: pe } = await open(b, { state: state(), seed: L.seedNq(), width, height: width === 390 ? 844 : 800, local: { 'planner.theme': 'dark' } });
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'dark applied before the app starts');
    const check = async (name) => {
      const r = await p.evaluate(audit);
      ok(!r.bad.length, `[${width}] ${name}: unreadable text ${r.bad.join(' ; ')}`);
      ok(!r.whites.length, `[${width}] ${name}: white boxes ${r.whites.join(', ')}`);
      if (width === 390) ok(!r.sideways, `[${width}] ${name}: sideways scroll`);
    };
    await check('today');
    for (const v of VIEWS.slice(1)) { await p.evaluate((v) => document.querySelector(`#views [data-v=${v}]`).click(), v); await wait(400); await check('view ' + v); }
    for (const h of HASHES) { await go(p, '#' + h); await check('#' + h); await p.keyboard.press('Escape'); }
    ok(!pe.length, `[${width}] page errors: ${pe.join('|')}`);
    await ctx.close();
  }

  // 1b. Today with every card tier expanded
  for (const width of [390, 1366]) {
    const { ctx, p, errs: pe } = await open(b, { state: state(), seed: L.seedNq(), width, height: width === 390 ? 844 : 800, local: { 'planner.theme': 'dark', 'planner.toOpen': JSON.stringify(Object.fromEntries(TO_IDS.map((i) => [i, 1]))) } });
    const r = await p.evaluate(audit);
    ok(!r.bad.length, `[${width}] Today expanded: unreadable text ${r.bad.join(' ; ')}`);
    ok(!r.whites.length, `[${width}] Today expanded: white boxes ${r.whites.join(', ')}`);
    if (width === 390) ok(!r.sideways, 'Today expanded: sideways scroll');
    ok(!pe.length, 'Today expanded page errors: ' + pe.join('|'));
    await ctx.close();
  }

  // 2. the saved choice persists; the header button flips it; the Settings sheet shows and changes it
  {
    const { ctx, p } = await open(b, { state: state(), seed: L.seedNq(), width: 390 });
    const th = () => p.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('planner.theme'), document.querySelector('meta[name=theme-color]').content]);
    ok((await th())[0] === 'light', 'default is light');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth) && (await p.evaluate(() => { const r = document.querySelector('#thBtn').getBoundingClientRect(); return r.top < 64 && r.right <= window.innerWidth; })), 'sun/moon button sits in the first header row at 390px');
    await p.click('#thBtn'); await wait(300);
    let t = await th(); ok(t[0] === 'dark' && t[1] === 'dark' && t[2] === '#0f1115', 'button turns dark and sets theme-color: ' + t);
    ok((await p.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(15, 17, 21)', 'dark page background');
    ok((await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme)) === 'dark', 'color-scheme is dark so native pickers follow');
    await p.reload(); await wait(900);
    ok((await th())[0] === 'dark', 'dark persists across reload');
    ok(await p.evaluate(() => !localStorage.getItem('planner.v1') || !/planner\.theme|"theme"/.test(localStorage.getItem('planner.v1'))), 'choice is not stored in the synced data');
    await p.click('#thBtn'); await wait(300); t = await th(); ok(t[0] === 'light' && t[1] === 'light' && t[2] === '#ffffff', 'button flips back to light: ' + t);
    await go(p, '#appearance');
    ok(await p.isVisible('#stDlg'), '#appearance opens the Settings sheet');
    ok(/Appearance/.test(await p.textContent('#stDlg')) && /Match my phone/.test(await p.textContent('#stSeg')), 'sheet is labelled Appearance with Light, Dark and Match my phone');
    await p.click('#stSeg [data-th=dark]'); await wait(200);
    ok((await th())[0] === 'dark' && (await p.getAttribute('#stSeg [data-th=dark]', 'aria-pressed')) === 'true', 'segmented control sets dark');
    ok(/dark planner/i.test(await p.textContent('#stNote')), 'one-line explanation shown');
    await ctx.close();
  }

  // 3. 'Match my phone' follows the phone, live
  {
    const { ctx, p } = await open(b, { state: state(), seed: L.seedNq(), width: 390, local: { 'planner.theme': 'system' } });
    const mode = () => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await p.emulateMedia({ colorScheme: 'dark' }); await wait(300); ok(await mode() === 'dark', 'system + phone dark = dark');
    await p.emulateMedia({ colorScheme: 'light' }); await wait(300); ok(await mode() === 'light', 'system + phone light = light (live change)');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.reload(); await wait(900); ok(await mode() === 'dark', 'system resolves dark at load, before first paint');
    ok(await p.evaluate(() => localStorage.getItem('planner.theme')) === 'system', 'choice stays "system"');
    await ctx.close();
    // an explicit Light stays light on a dark phone
    const c2 = await open(b, { state: state(), seed: L.seedNq(), width: 390, local: { 'planner.theme': 'light' } });
    await c2.p.emulateMedia({ colorScheme: 'dark' }); await wait(300);
    ok(await c2.p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light', 'Light ignores a dark phone');
    await c2.ctx.close();
  }

  // 4. palette commands and the All tools entry
  {
    const { ctx, p } = await open(b, { state: state(), seed: L.seedNq(), width: 390 });
    await go(p, '#tools'); ok(/Appearance and settings/.test(await p.textContent('#hbDlg')), 'All tools lists Appearance and settings');
    await p.click('[data-hbtool=settings]'); await wait(300); ok(await p.isVisible('#stDlg'), 'tile opens the Settings sheet');
    await p.keyboard.press('Escape');
    await go(p, '#search'); await p.keyboard.type('dark mode'); await wait(300); await p.keyboard.press('Enter'); await wait(300);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'palette "Dark mode" works');
    await ctx.close();
  }

  // 5. light mode is exactly what it was
  {
    const { ctx, p } = await open(b, { state: L.fullState(), seed: L.seedNq(), width: 1366, height: 800 });
    const got = await p.evaluate((sels) => { const o = {}; sels.forEach((s) => { const e = document.querySelector(s); if (!e) return; const cs = getComputedStyle(e); o[s] = [cs.backgroundColor, cs.color, cs.borderTopColor].join('|'); }); return o; }, BASE_SEL);
    BASE_SEL.forEach((s) => ok(got[s] === LIGHT[s], `light unchanged ${s}: ${got[s]} vs ${LIGHT[s]}`));
    await ctx.close();
  }

  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'THEME OK');
  await b.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
