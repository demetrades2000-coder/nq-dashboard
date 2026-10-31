// Live View on the phone (owner 2026-10-28: "add it to the phone too"; loaded by index.html with one <script defer> AFTER
// real.js; read-only). The PC dashboard's Live View (web_next/js/next/liveview.js) for the phone: one big chart with what
// the bots are doing drawn on it, one colour per strategy (Zlarior blue, ATLAS orange, BLITZ purple, a switch each), the
// "What the bot is thinking" cards, the bot's running feed, 1m / 5m, dark / light, a Full screen button.
//   Data   liveview.json, pushed by the PC every 60 s next to live.json on the branch `live` of this site's repo
//          (engine/live_publish.Publisher.extra -> engine/liveview_api.phone_view: the same layers as the PC page; 1m bars
//          of the last 8 hours + today's 5m session as bars5). Read like live.js reads live.json: GitHub's API first, then
//          raw.githubusercontent.com when the API's hourly limit runs low (shared with live.js via window.LIVE.apiUntil).
//          Polled every 30-60 s while this page is open and visible; live.js skips its own poll meanwhile.
//   Chart  liveviewchart.js, byte-identical to web_next/js/next/liveviewchart.js (dynamic import()); liveview.css too.
//   Touch  drag sideways = scroll back in time (the page still scrolls up / down), pinch or + / − = zoom, tap = OHLC.
//   Full   the Fullscreen API where the phone has it (Android), else the page covers the whole screen (iPhone); turn the
//          phone sideways for the biggest chart. "Exit" or the back gesture leaves it.
// Nothing here talks to the bot's controls.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined') return;
  const ID = 'liveview';
  const host = location.hostname, seg = location.pathname.split('/').filter(Boolean)[0];
  const OWNER = /\.github\.io$/.test(host) ? host.split('.')[0] : 'demetrades2000-coder';
  const REPO = /\.github\.io$/.test(host) && seg && !/\./.test(seg) ? seg : 'nq-dashboard';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/liveview.json?ref=live`;
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/live/liveview.json`;
  const OLD_S = 3 * 60, OFF_S = 20 * 60;           // data older than this: "x min old" / "the PC is not sending"
  const pref = (k, d) => { try { return store.get(k, d); } catch (e) { return d; } };
  const save = (k, v) => { try { store.set(k, v); } catch (e) { /* private window */ } };
  const L = window.LVP = {
    d: null, busy: false, timer: null, tick: null, err: null, src: null, at: 0, every: 45, missing: false,
    tf: pref('lv.tf', '1m'), theme: pref('lv.theme', 'dark') === 'light' ? 'light' : 'dark',
    on: Object.assign({ lit: true, atlas: true, scalp: true, structure: true }, pref('lv.on', {})),
    think: pref('lv.think', true), feed: pref('lv.feed', true), feedF: pref('lv.feedF', 'all'), important: pref('lv.imp', false),
    view: { n: null, end: 0 }, hover: null, seen: 0, geo: null, raf: 0, lastFx: 0, fast: false, root: null, home: null, chart: null,
  };
  const PAL = {
    dark: { lit: '#4f9bff', atlas: '#ff9a3d', scalp: '#b388ff', sys: '#94a3b8', structure: '#e2e8f0' },
    light: { lit: '#2563eb', atlas: '#ea580c', scalp: '#7c3aed', sys: '#475569', structure: '#334155' },
  };
  const NAMES = { lit: 'Zlarior', atlas: 'ATLAS', scalp: 'BLITZ', sys: 'Bot', structure: 'Structure' };
  const col = (k) => (PAL[L.theme][k] || PAL[L.theme].sys);
  const okN = (v) => typeof v === 'number' && Number.isFinite(v);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtPx = (x) => (x == null || isNaN(x) ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
  const fmtUsd = (x, sign = true) => (x == null || isNaN(x) ? '—' : (sign ? (x > 0 ? '+' : x < 0 ? '-' : '') : '') + '$' + Math.abs(Math.round(x)).toLocaleString('en-US'));
  const etHM = (t, sec) => new Date(t * 1000).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}), hour12: false });
  function dur(s) {
    s = Math.max(0, Math.round(s));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m ${String(x).padStart(2, '0')}s` : `${x}s`;
  }
  const active = () => typeof PAGE !== 'undefined' && PAGE === ID && !!L.root && L.root.isConnected;
  const q = (s) => (L.root ? L.root.querySelector(s) : null);
  const tick = (ok) => (ok === true ? '<b class="lv-ok">✓</b>' : ok === false ? '<b class="lv-no">✗</b>' : '<b class="lv-wait">…</b>');
  const age = () => (L.d && okN(+L.d.t) ? Math.max(0, Date.now() / 1000 - L.d.t) : null);

  // ------------------------------------------------------------------ stylesheet, phone touches, chart module (on demand)
  function ensureCss() {
    if (document.querySelector('link[data-lv]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'liveview.css?v=2'; l.dataset.lv = '1';
    document.head.appendChild(l);
    const s = document.createElement('style'); s.dataset.lv = 'phone';
    s.textContent = `
.lv-phone { height: auto; min-height: 0; border-radius: 18px; margin: 0 0 12px; }
.lv-phone .lv-bar { padding: 9px 10px; gap: 7px 8px; }
.lv-phone .lv-title > b { font-size: 17px; }
.lv-phone .lv-ctrls { gap: 6px; }
.lv-phone .lv-btn, .lv-phone .lv-seg button, .lv-phone .lv-sw { min-height: 36px; padding: 6px 10px; font-size: 13px; white-space: nowrap; }
.lv-phone .lv-ohlc { font-size: 11px; line-height: 1.35; right: 86px; }
.lv-phone .lv-ohlc small { display: block; color: var(--lv-mut); font-size: 10.5px; }
.lv-phone .lv-legend { top: 40px; }
.lv-phone .lv-fs span { display: inline; }
.lv-phone .lv-chartwrap { height: 58vh; min-height: 320px; }
.lv-phone #lvCv { touch-action: pan-y; cursor: default; }
.lv-phone .lv-zoom { right: 70px; bottom: 26px; }
.lv-phone .lv-zoom .lv-btn { min-height: 34px; min-width: 34px; justify-content: center; }
.lv-phone .lv-feed { height: 300px; }
.lv-phone .lv-m { grid-template-columns: 40px 9px 1fr; padding: 4px 10px; }
.lv-banner { margin: 8px 10px 0; padding: 9px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; border: 1px solid var(--lv-line2); background: var(--lv-glass2); color: var(--lv-ink2); }
.lv-banner b { color: var(--lv-ink); } .lv-banner.bad { border-color: color-mix(in srgb, var(--lv-no) 55%, transparent); } .lv-banner.warn { border-color: color-mix(in srgb, var(--lv-wait) 55%, transparent); }
.lv-banner[hidden] { display: none; }
.lv-turn { display: none; }
.lv-phone.lv-max { position: fixed; inset: 0; z-index: 9999; margin: 0; border-radius: 0; border: 0; height: 100dvh; overflow: auto; overscroll-behavior: contain;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
.lv-phone.lv-max > *, .lv-phone:fullscreen > * { flex-shrink: 0; }
.lv-phone.lv-max .lv-main, .lv-phone:fullscreen .lv-main { flex: none; }
.lv-phone.lv-max #lvCv, .lv-phone:fullscreen #lvCv { touch-action: none; }
.lv-phone.lv-max .lv-chartwrap, .lv-phone:fullscreen .lv-chartwrap { height: 66vh; }
@media (orientation: portrait) { .lv-phone.lv-max .lv-turn, .lv-phone:fullscreen .lv-turn { display: block; text-align: center; font-size: 12px; color: var(--lv-mut); padding: 4px 0 6px; } }
@media (orientation: landscape) and (max-height: 600px) {
  .lv-phone.lv-max .lv-chartwrap, .lv-phone:fullscreen .lv-chartwrap { height: calc(100dvh - 52px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); min-height: 0; }
  .lv-phone.lv-max .lv-src, .lv-phone:fullscreen .lv-src, .lv-phone.lv-max .lv-banner, .lv-phone:fullscreen .lv-banner { display: none; }
  .lv-phone.lv-max .lv-bar, .lv-phone:fullscreen .lv-bar { flex-wrap: nowrap; overflow-x: auto; padding: 6px 10px; gap: 10px; height: 50px; }
  .lv-phone.lv-max .lv-title, .lv-phone:fullscreen .lv-title { flex-wrap: nowrap; flex: none; }
  .lv-phone.lv-max .lv-title > b, .lv-phone:fullscreen .lv-title > b { display: none; }
  .lv-phone.lv-max .lv-ctrls, .lv-phone:fullscreen .lv-ctrls, .lv-phone.lv-max .lv-sws, .lv-phone:fullscreen .lv-sws { flex-wrap: nowrap; }
  .lv-phone.lv-max #lvTheme, .lv-phone:fullscreen #lvTheme, .lv-phone.lv-max #lvFeedB, .lv-phone:fullscreen #lvFeedB,
  .lv-phone.lv-max #lvThinkB, .lv-phone:fullscreen #lvThinkB { display: none; }
  .lv-phone.lv-max .lv-btn, .lv-phone:fullscreen .lv-btn, .lv-phone.lv-max .lv-seg button, .lv-phone:fullscreen .lv-seg button,
  .lv-phone.lv-max .lv-sw, .lv-phone:fullscreen .lv-sw { min-height: 34px; padding: 4px 9px; }
}
html.lv-lock, html.lv-lock body { overflow: hidden; }`;
    document.head.appendChild(s);
  }
  function chartMod() {
    if (!L.chart) L.chart = import('./liveviewchart.js?v=2').catch((e) => { L.chart = null; throw e; });
    return L.chart;
  }
  let drawChart = null, drawFx = null;

  // ------------------------------------------------------------------ data: liveview.json from the live branch
  async function get(url, opts) { const r = await fetch(url, opts); if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; e.r = r; throw e; } return r; }
  async function fetchView() {
    const LV = window.LIVE || {};
    let r = null, src = 'api';
    if (Date.now() >= (LV.apiUntil || 0) && Date.now() >= (L.apiUntil || 0)) {
      try {
        r = await get(API, { cache: 'no-cache', headers: { Accept: 'application/vnd.github.raw+json' } });
        const rem = +r.headers.get('x-ratelimit-remaining'), reset = +r.headers.get('x-ratelimit-reset');
        if (okN(rem)) {
          L.every = rem > 30 ? 30 : 60;
          if (rem <= 12) L.apiUntil = okN(reset) && reset > 0 ? reset * 1000 : Date.now() + 15 * 60e3;   // leave the rest to live.json
          if (rem <= 2 && window.LIVE) window.LIVE.apiUntil = L.apiUntil;
        }
      } catch (e) {
        r = null;
        const h = e.r && e.r.headers, reset = h ? +h.get('x-ratelimit-reset') : NaN;
        if (e.status === 403 || e.status === 429 || !e.status) L.apiUntil = okN(reset) && reset > 0 ? reset * 1000 : Date.now() + 15 * 60e3;
        else if (e.status === 404) L.apiUntil = Date.now() + 5 * 60e3;
      }
    }
    if (!r) {
      src = 'raw';
      try { r = await get(RAW + '?t=' + Date.now(), { cache: 'no-store' }); }
      catch (e) { if (e.status === 404) { L.missing = true; throw new Error('not sent yet'); } throw e; }
    }
    let j = await r.json();
    if (j && j.encoding === 'base64' && typeof j.content === 'string') {
      const bin = atob(j.content.replace(/\s/g, '')), u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      j = JSON.parse(new TextDecoder().decode(u8));
    }
    if (!j || j.kind !== 'le-liveview' || !okN(+j.t)) throw new Error('not a liveview.json');
    L.missing = false;
    return { j, src };
  }
  async function load(force) {
    if (L.busy || (!force && document.hidden)) return;
    L.busy = true;
    try {
      const { j, src } = await fetchView();
      const changed = !L.d || j.t !== L.d.t;
      L.d = j; L.src = src; L.err = null; L.at = Date.now();
      if (changed && active()) { paint(); think(); feed(); }
    } catch (e) { L.err = e.message || String(e); }
    finally { L.busy = false; }
    if (active()) { top(); banner(); }
  }
  function schedule() {
    clearTimeout(L.timer);
    L.timer = setTimeout(async () => { if (!active()) return; await load(false); schedule(); }, L.every * 1000);
  }
  L.load = load;

  // ------------------------------------------------------------------ shell
  function shell() {
    const sw = (k) => `<button type="button" class="lv-sw" data-lv-on="${k}" aria-pressed="${!!L.on[k]}" style="--c:${col(k)}"><i></i><span>${esc(NAMES[k])}</span></button>`;
    const root = document.createElement('div');
    root.className = 'lv-root lv-phone'; root.id = 'lvRoot'; root.dataset.theme = L.theme;
    root.innerHTML = `<header class="lv-bar">
        <div class="lv-title"><b>Live View</b><span class="lv-px mono" id="lvPx">—</span><span class="lv-src" id="lvSrc">loading from the PC…</span></div>
        <div class="lv-ctrls">
          <button type="button" class="lv-btn lv-fs" id="lvFs" title="Full screen">⛶ <span>Full screen</span></button>
          <div class="lv-seg" id="lvTf" role="group" aria-label="Timeframe">${['1m', '5m'].map((t) => `<button type="button" data-v="${t}" aria-pressed="${L.tf === t}">${t}</button>`).join('')}</div>
          <div class="lv-sws" role="group" aria-label="Strategies">${sw('lit')}${sw('atlas')}${sw('scalp')}${sw('structure')}</div>
          <button type="button" class="lv-btn" id="lvThinkB" aria-pressed="${L.think}" title="What the bot is thinking">🧠 Thinking</button>
          <button type="button" class="lv-btn" id="lvFeedB" aria-pressed="${L.feed}" title="The bot's running feed">Feed</button>
          <button type="button" class="lv-btn" id="lvTheme" title="Dark / light"></button>
        </div>
      </header>
      <div class="lv-banner" id="lvBan" hidden></div>
      <div class="lv-turn" aria-hidden="true">Turn your phone sideways for the biggest chart</div>
      <div class="lv-main ${L.think ? '' : 'nothink'}" id="lvMain">
        <div class="lv-chartwrap" id="lvWrap"><canvas id="lvCv" aria-label="Live NQ chart"></canvas><canvas id="lvFx" aria-hidden="true"></canvas>
          <div class="lv-ohlc mono" id="lvOhlc"></div><div class="lv-legend" id="lvLeg"></div><div class="lv-note" id="lvNote" hidden></div>
          <div class="lv-zoom"><button type="button" class="lv-btn sm" id="lvZin" title="Zoom in" aria-label="Zoom in">+</button><button type="button" class="lv-btn sm" id="lvZout" title="Zoom out" aria-label="Zoom out">−</button><button type="button" class="lv-btn sm" id="lvLive" title="Back to now">Now</button></div></div>
        <aside class="lv-think" id="lvThink" aria-label="What the bot is thinking"></aside>
      </div>
      <section class="lv-feed" id="lvFeed" ${L.feed ? '' : 'hidden'} aria-label="Bot feed">
        <div class="lv-ticker" id="lvTicker" aria-hidden="true"><div class="lv-ticker-r" id="lvTickR"></div></div>
        <div class="lv-feed-h"><b>What the bot says</b>
          <div class="lv-seg sm" id="lvFF">${[['all', 'All'], ['lit', 'Zlarior'], ['atlas', 'ATLAS'], ['scalp', 'BLITZ'], ['sys', 'Bot']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${L.feedF === k}">${l}</button>`).join('')}</div>
          <label class="lv-chk"><input type="checkbox" id="lvImp" ${L.important ? 'checked' : ''}> important only</label>
          <span class="lv-muted" id="lvPushes"></span></div>
        <ol class="lv-feed-l" id="lvFeedL"></ol>
      </section>`;
    L.root = root;
    themeBtn();
    wire(root);
    return root;
  }
  function themeBtn() { const b = q('#lvTheme'); if (b) b.textContent = L.theme === 'dark' ? '☀ Light' : '☾ Dark'; }
  function setTheme(t) {
    L.theme = t; save('lv.theme', t);
    L.root.dataset.theme = t; themeBtn();
    L.root.querySelectorAll('[data-lv-on]').forEach((b) => b.style.setProperty('--c', col(b.dataset.lvOn)));
    paint(); think(); feed();
  }
  const setAll = (sel, fn) => L.root.querySelectorAll(sel).forEach(fn);

  function wire(el) {
    const $q = (s) => el.querySelector(s);
    $q('#lvTf').onclick = (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; L.tf = b.dataset.v; save('lv.tf', L.tf); L.view = { n: null, end: 0 }; setAll('#lvTf button', (x) => x.setAttribute('aria-pressed', x.dataset.v === L.tf)); paint(); };
    el.querySelectorAll('[data-lv-on]').forEach((b) => { b.onclick = () => { const k = b.dataset.lvOn; L.on[k] = !L.on[k]; save('lv.on', L.on); b.setAttribute('aria-pressed', L.on[k]); paint(); think(); }; });
    $q('#lvThinkB').onclick = (e) => { L.think = !L.think; save('lv.think', L.think); e.currentTarget.setAttribute('aria-pressed', L.think); $q('#lvMain').classList.toggle('nothink', !L.think); think(); requestAnimationFrame(() => paint()); };
    $q('#lvFeedB').onclick = (e) => { L.feed = !L.feed; save('lv.feed', L.feed); e.currentTarget.setAttribute('aria-pressed', L.feed); $q('#lvFeed').hidden = !L.feed; requestAnimationFrame(() => paint()); };
    $q('#lvTheme').onclick = () => setTheme(L.theme === 'dark' ? 'light' : 'dark');
    $q('#lvFF').onclick = (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; L.feedF = b.dataset.v; save('lv.feedF', L.feedF); setAll('#lvFF button', (x) => x.setAttribute('aria-pressed', x.dataset.v === L.feedF)); feed(); };
    $q('#lvImp').onchange = (e) => { L.important = e.target.checked; save('lv.imp', L.important); feed(); };
    $q('#lvFs').onclick = toggleFs;
    $q('#lvZin').onclick = () => zoom(1 / 1.4);
    $q('#lvZout').onclick = () => zoom(1.4);
    $q('#lvLive').onclick = () => { L.view = { n: null, end: 0 }; paint(); };
    const cv = $q('#lvCv');
    cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    // one finger: drag sideways = back in time; two fingers: pinch = zoom
    const pts = new Map();
    let drag = null, pinch = null, dragRaf = 0;
    const endDrag = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size && drag) { drag = null; L.fast = false; paint(); } };
    cv.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, e.clientX);
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
      if (pts.size === 2) { const xs = [...pts.values()]; pinch = { d: Math.max(20, Math.abs(xs[0] - xs[1])), n: L.view.n || (L.geo && L.geo.n) || defN() }; drag = null; }
      else drag = { x: e.clientX, end: L.view.end };
      const r = cv.getBoundingClientRect(); L.hover = { x: e.clientX - r.left, y: e.clientY - r.top }; fx(true);
    });
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      if (pts.has(e.pointerId)) pts.set(e.pointerId, e.clientX);
      if (pinch && pts.size >= 2) {
        const xs = [...pts.values()], d = Math.max(20, Math.abs(xs[0] - xs[1]));
        const n = (bars().length) || 0;
        const nv = Math.max(20, Math.min(Math.max(20, n), Math.round(pinch.n * pinch.d / d)));
        if (nv !== L.view.n) { L.view.n = nv; L.fast = true; if (!dragRaf) dragRaf = requestAnimationFrame(() => { dragRaf = 0; paint(); }); }
        return;
      }
      L.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (drag && L.geo) {
        const di = Math.round((e.clientX - drag.x) / L.geo.bw);
        const n = bars().length;
        const nv = Math.max(0, Math.min(n - 10, drag.end + di));
        if (nv !== L.view.end) { L.view.end = nv; L.fast = true; if (!dragRaf) dragRaf = requestAnimationFrame(() => { dragRaf = 0; paint(); }); }
        return;
      }
      fx(true);
    });
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { L.hover = null; fx(true); } });
    cv.addEventListener('dblclick', () => { L.view = { n: null, end: 0 }; paint(); });
    new ResizeObserver(() => paint()).observe($q('#lvWrap'));
  }
  const bars = () => (L.d ? (L.tf === '5m' ? L.d.bars5 : L.d.bars) || [] : []);
  const defN = () => { const w = (q('#lvWrap') || {}).clientWidth || 390; return Math.max(30, Math.round(w / (L.tf === '1m' ? 6.5 : 5.5))); };
  function zoom(f) {
    const n = bars().length; if (!n) return;
    const cur = L.view.n || (L.geo && L.geo.n) || Math.min(n, defN());
    L.view.n = Math.max(20, Math.min(n, Math.round(cur * f)));
    paint();
  }

  // ------------------------------------------------------------------ full screen: the Fullscreen API, else the page covers the screen
  const isFs = () => !!L.root && (document.fullscreenElement === L.root || document.webkitFullscreenElement === L.root || L.root.classList.contains('lv-max'));
  function fsLabel() { const b = q('#lvFs'); if (b) b.querySelector('span').textContent = isFs() ? 'Exit' : 'Full screen'; }
  function maxOn() {
    const r = L.root; if (!r || r.classList.contains('lv-max')) return;
    L.home = r.parentNode;
    r.classList.add('lv-max');
    document.body.appendChild(r);                 // out of the page, so no animated / transformed parent holds it
    document.documentElement.classList.add('lv-lock');
    fsLabel(); requestAnimationFrame(() => paint());
  }
  function maxOff() {
    const r = L.root; if (!r || !r.classList.contains('lv-max')) return;
    r.classList.remove('lv-max');
    document.documentElement.classList.remove('lv-lock');
    const pg = document.getElementById('page');
    if (active() || (typeof PAGE !== 'undefined' && PAGE === ID)) {
      const home = L.home && L.home.isConnected ? L.home : pg && pg.querySelector('.lv-host');
      if (home) home.appendChild(r); else r.remove();
    } else r.remove();
    fsLabel(); requestAnimationFrame(() => paint());
  }
  function toggleFs() {
    const r = L.root; if (!r) return;
    if (L.fsReq) L.fsReq.done = true;      // a pending request no longer falls back
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => null);
      return;
    }
    if (r.classList.contains('lv-max')) { maxOff(); return; }
    const req = r.requestFullscreen || r.webkitRequestFullscreen;
    if (!req) { maxOn(); return; }
    const ask = L.fsReq = { done: false };  // refused (a promise, an error event or nothing at all): cover the screen instead
    const fail = () => { if (!ask.done && !isFs()) { ask.done = true; maxOn(); } };
    try {
      const p = req.call(r, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(fail);
    } catch (e) { fail(); }
    setTimeout(fail, 700);
  }
  const fsChange = () => { if (L.fsReq && (document.fullscreenElement || document.webkitFullscreenElement)) L.fsReq.done = true; fsLabel(); setTimeout(paint, 80); };
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);
  ['fullscreenerror', 'webkitfullscreenerror'].forEach((ev) => document.addEventListener(ev, () => { if (L.root && L.fsReq && !L.fsReq.done && !isFs()) { L.fsReq.done = true; maxOn(); } }));
  addEventListener('hashchange', () => setTimeout(() => {
    if (typeof PAGE === 'undefined' || PAGE === ID || !L.root) return;
    maxOff();
    if (document.fullscreenElement && document.fullscreenElement === L.root) Promise.resolve(document.exitFullscreen()).catch(() => null);
  }, 0));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && L.root && L.root.classList.contains('lv-max')) maxOff(); });

  // ------------------------------------------------------------------ top line + the "is the PC sending" banner
  function top() {
    const d = L.d, px = q('#lvPx'), sr = q('#lvSrc'); if (!px || !sr) return;
    if (!d) { sr.innerHTML = L.err ? `<b class="lv-no">●</b> ${esc(L.missing ? 'waiting for the PC' : L.err)}` : 'loading from the PC…'; return; }
    px.textContent = `NQ ${fmtPx(d.price)}`;
    const a = age(), stale = d.feed && d.feed.stale, off = a != null && a > OFF_S, old = a != null && a > OLD_S;
    const live = d.running && !stale && !old;
    const dot = off ? '<b class="lv-no lv-dot">●</b> PC not sending · ' : stale ? '<b class="lv-no lv-dot">●</b> FEED STALE · ' : old ? '<b class="lv-wait lv-dot">●</b> ' : live ? '<b class="lv-ok lv-dot live">●</b> live · ' : '<b class="lv-wait lv-dot">●</b> bot stopped · ';
    const ago = a == null ? '' : a < 90 ? `${Math.round(a)} s ago` : `${Math.round(a / 60)} min ago`;
    sr.innerHTML = `${dot}from the PC ${esc(ago)} · ${esc(L.tf)}${d.account ? ' · ' + esc(d.account) : ''}`;
  }
  function banner() {
    const b = q('#lvBan'); if (!b) return;
    const a = age();
    let txt = '', lvl = '';
    if (!L.d && L.missing) { txt = '<b>Waiting for the PC.</b> The PC starts sending the Live View after its next update. It installs updates by itself outside trading hours. Nothing to do.'; lvl = 'warn'; }
    else if (!L.d && L.err) { txt = `<b>Could not load the Live View.</b> ${esc(L.err)}. It tries again by itself.`; lvl = 'bad'; }
    else if (a != null && a > OFF_S) { txt = `<b>The PC is not sending.</b> Last data ${esc(etHM(L.d.t))} ET (${esc(dur(a))} ago). The Live View comes from your PC: it updates while the PC is on and the bot runs.`; lvl = 'bad'; }
    else if (L.d && L.d.error) { txt = `<b>The PC could not build the Live View:</b> ${esc(L.d.error)}`; lvl = 'bad'; }
    b.hidden = !txt; b.className = 'lv-banner ' + lvl; b.innerHTML = txt;
  }

  // ------------------------------------------------------------------ chart: static layer + animated overlay
  function paint() {
    const cv = q('#lvCv'); if (!cv || !L.d || !drawChart) return;
    if (!L.root.isConnected) return;
    const d = { ...L.d, bars: bars(), tf: L.tf };
    const view = L.view.n ? L.view : { ...L.view, n: defN() };
    L.geo = drawChart(cv, d, { on: L.on, view, tf: L.tf, theme: L.theme, fast: L.fast });
    L.root.querySelectorAll('[data-lv-on="structure"]').forEach((b) => { b.hidden = !d.structure; });
    q('#lvLeg').innerHTML = ['lit', 'atlas', 'scalp'].filter((k) => L.on[k]).map((k) => {
      const s = (d.strategies || {})[k] || {};
      const what = k === 'lit' ? 'levels · setup · position' : k === 'atlas' ? 'EMA 21 / 50 · S/R · plans · position' : (s.placeholder ? 'not running yet' : 'band · signals · PAPER position');
      return `<span style="--c:${col(k)}"><i></i>${esc(k === 'scalp' ? 'BLITZ (paper)' : s.name || NAMES[k])} <em>${esc(what)}</em></span>`;
    }).join('');
    const note = q('#lvNote');
    const msg = !d.bars.length ? 'No bars yet: the chart fills in once the bot has its NinjaTrader bars.' : '';
    note.hidden = !msg; note.textContent = msg;
    fx(true);
    loop();
  }
  function fx(readout) {
    const c = q('#lvFx'); if (!c || !L.d || !drawFx) return;
    const r = drawFx(c, L.geo, { t: performance.now(), hover: L.hover, still: reduced() });
    if (readout) {
      const B = bars(), b = r.hoverBar || B[B.length - 1];
      q('#lvOhlc').innerHTML = b ? `<span>${etHM(b[0])} ET</span> · C <b class="${b[4] >= b[1] ? 'lv-ok' : 'lv-no'}">${fmtPx(b[4])}</b>`
        + `<small>O ${fmtPx(b[1])} · H ${fmtPx(b[2])} · L ${fmtPx(b[3])}${r.hoverPx != null ? ` · at ${fmtPx(r.hoverPx)}` : ''}</small>` : '';
    }
  }
  function loop() {                     // ~30 fps on the overlay only, while the page is on screen
    if (L.raf || reduced()) return;
    const step = (ts) => {
      if (!active() || document.hidden) { L.raf = 0; return; }
      if (ts - L.lastFx > 33) { L.lastFx = ts; fx(false); }
      L.raf = requestAnimationFrame(step);
    };
    L.raf = requestAnimationFrame(step);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active()) { loop(); load(true).then(schedule); } });

  // ------------------------------------------------------------------ thinking cards (same as the PC page)
  function stepper(stages) {
    if (!stages || !stages.length) return '';
    const cur = stages.find((s) => s.state === 'now');
    return `<ol class="lv-steps">${stages.map((s) => `<li class="${esc(s.state)}" title="${esc(s.n + '. ' + s.label)}"><i>${s.n}</i></li>`).join('')}</ol>`
      + (cur ? `<div class="lv-stepnow">Step ${cur.n} of ${stages.length}: <b>${esc(cur.label)}</b></div>` : '');
  }
  function checks(list) {
    if (!list || !list.length) return '';
    return `<ul class="lv-checks">${list.map((c) => `<li>${tick(c.ok)}<div><b>${esc(c.label)}</b>${c.text ? `<small>${esc(c.text)}</small>` : ''}</div></li>`).join('')}</ul>`;
  }
  const nowT = () => (L.d ? L.d.t + Math.round((Date.now() - L.at) / 1000) : Date.now() / 1000);
  const cd = (t, label) => (t ? `<span class="lv-cd" data-cd="${t}" data-l="${esc(label)}">${esc(label)} ${dur(t - nowT())}</span>` : '');
  function posBox(p, color, real) {
    if (!p) return '';
    const n = p.qty;
    const lines = [`<b>${esc(p.side || '')}${n ? ` ${n} MNQ` : ''}</b> @ ${fmtPx(p.entry)}${p.account ? ` · ${esc(p.account)}` : ''}`];
    if (real && n) {
      lines.push(`now <b class="${(p.unrealized_usd || 0) >= 0 ? 'lv-ok' : 'lv-no'}">${fmtUsd(p.unrealized_usd)}</b>${p.unrealized_r_now != null ? ` (${p.unrealized_r_now >= 0 ? '+' : ''}${Number(p.unrealized_r_now).toFixed(2)}R)` : ''}`);
      const dr = p.dir || (p.side === 'LONG' ? 1 : -1);
      if (p.stop != null && p.entry != null) lines.push(`stop ${fmtPx(p.stop)} = <b class="lv-no">${fmtUsd((p.stop - p.entry) * dr * 2 * n)}</b>`);
      if (p.target != null && p.entry != null) lines.push(`target ${fmtPx(p.target)} = <b class="lv-ok">${fmtUsd((p.target - p.entry) * dr * 2 * n)}</b>`);
    } else lines.push('<span class="lv-muted">model trade, not routed on an account: no real size</span>');
    return `<div class="lv-pos" style="--c:${color}">${lines.map((x) => `<div>${x}</div>`).join('')}</div>`;
  }
  function think() {
    const el = q('#lvThink'); if (!el || !L.d) return;
    if (!L.think) { el.innerHTML = ''; return; }
    const open = new Set([...el.querySelectorAll('details[open]')].map((x) => x.dataset.k));
    const S = L.d.strategies || {};
    const out = [];
    const lit = S.lit;
    if (lit && L.on.lit) {
      const t = lit.thinking || {};
      out.push(`<article class="lv-card" style="--c:${col('lit')}"><header><i></i><b>Zlarior</b><span class="lv-pill">${esc((t.stage && t.stage.label) || '—')}${t.stage && t.stage.n ? ` · ${t.stage.n}/10` : ''}</span></header>
        ${lit.error ? `<p class="lv-no">${esc(lit.error)}</p>` : ''}
        ${stepper(t.stages)}
        <p class="lv-head">${esc(t.headline || 'Waiting for the first Brain snapshot')}</p>
        ${t.detail && t.detail !== t.headline ? `<p class="lv-muted small">${esc(t.detail)}</p>` : ''}
        <div class="lv-chips">${(t.distance || []).map((x) => `<span class="lv-chip"><b class="mono">${fmtPx(x.pts)}</b> pts ${esc(x.label)}</span>`).join('')}
          ${t.stop_preview ? `<span class="lv-chip">stop would be <b class="mono">${fmtPx(t.stop_preview)}</b> pts</span>` : ''}</div>
        <div class="lv-chips">${t.window ? `<span class="lv-chip ${t.window.open ? 'on' : ''}">${cd(t.window.t, t.window.open ? 'window closes in' : 'window opens in')}</span>` : ''}
          ${t.expires ? `<span class="lv-chip on">${cd(t.expires.t, 'limit expires in')}</span>` : ''}</div>
        ${posBox(lit.position, col('lit'), lit.position && !lit.position.paper)}
        ${checks(t.checklist)}
      </article>`);
    }
    const at = S.atlas;
    if (at && L.on.atlas) {
      const mem = (at.members || []).filter((m) => !m.candidate), cand = (at.members || []).filter((m) => m.candidate);
      const row = (m) => `<details class="lv-mem" data-k="${esc(m.key)}" ${open.has(m.key) ? 'open' : ''}><summary><b>${esc(m.short)}</b><span class="lv-pill">${esc(m.stage || '—')}</span>${m.window ? `<span class="lv-muted small">${cd(m.window.t, m.window.open ? 'closes in' : 'opens in')}</span>` : ''}
          <p>${esc(m.text || '')}</p></summary>${checks(m.checks)}${m.first_fail ? `<p class="lv-muted small">first rule that fails: <b>${esc(m.first_fail)}</b></p>` : ''}</details>`;
      out.push(`<article class="lv-card" style="--c:${col('atlas')}"><header><i></i><b>ATLAS</b><span class="lv-pill">${esc(at.account || 'paper')}</span></header>
        ${at.error ? `<p class="lv-no">${esc(at.error)}</p>` : ''}${at.empty ? `<p class="lv-muted">${esc(at.empty)}</p>` : ''}
        ${posBox(at.position, col('atlas'), !!at.position)}
        ${mem.map(row).join('')}
        ${cand.length ? `<details class="lv-mem lv-cand" data-k="_cand" ${open.has('_cand') ? 'open' : ''}><summary><b>Other paper strategies</b><span class="lv-pill">research · paper</span></summary>${cand.map(row).join('')}</details>` : ''}
      </article>`);
    }
    const sc = S.scalp;
    if (sc && L.on.scalp) {
      const th = sc.thinking || {};
      const pp = (p) => (p ? `<div><b>${esc(p.ledger)}</b>: ${esc(p.side)} ${p.qty ? `${p.qty} MNQ` : '(no size)'} @ ${fmtPx(p.entry)} · now <b class="${(p.unrealized_usd || 0) >= 0 ? 'lv-ok' : 'lv-no'}">${fmtUsd(p.unrealized_usd)}</b> · stop ${fmtPx(p.stop)} = <b class="${(p.stop_usd || 0) >= 0 ? 'lv-ok' : 'lv-no'}">${fmtUsd(p.stop_usd)}</b></div>` : '');
      const p1 = sc.position, p2 = sc.position50 && (!p1 || sc.position50.ledger !== p1.ledger) ? sc.position50 : null;
      const sigs = (sc.signals || []).filter((x) => !x.ledger).slice(-4).reverse();
      out.push(`<article class="lv-card" style="--c:${col('scalp')}"><header><i></i><b>BLITZ</b><span class="lv-pill">${sc.placeholder ? 'not running' : 'PAPER · never routed'}</span></header>
        ${sc.error ? `<p class="lv-no">${esc(sc.error)}</p>` : ''}
        <p class="lv-head">${esc(th.headline || sc.text || '')}</p>
        ${p1 || p2 ? `<div class="lv-pos lv-paper" style="--c:${col('scalp')}"><div class="lv-paper-t">PAPER position · simulated accounts</div>${pp(p1)}${pp(p2)}</div>` : ''}
        ${th.eval ? `<p class="small">${esc(th.eval)}</p>` : ''}${th.funded50 ? `<p class="small">${esc(th.funded50)}</p>` : ''}
        ${sigs.length ? `<ul class="lv-checks">${sigs.map((x) => `<li>${tick(x.taken ? true : null)}<div><b>${esc(etHM(x.t))} ${esc(x.side)} signal</b><small>${esc(x.text)}</small></div></li>`).join('')}</ul>` : ''}
        ${sc.placeholder ? `<p class="lv-muted">${esc(sc.text || '')}</p>` : ''}
        <p class="small lv-bzgo"><a class="lv-bzlink" data-go="blitz" style="display:inline-flex;align-items:center;min-height:44px;color:inherit;font-weight:650;text-decoration:none;cursor:pointer">Open BLITZ: band, trades, results, go live ›</a></p></article>`);
    }
    // market structure (2026-10-29, liveview_api.view() "structure" when present): the summary + each frame's trend / last break
    const st = L.d.structure;
    if (st && typeof st === 'object' && L.on.structure !== false) {
      const fr = st.frames || {}, up = (v) => v === 1 || /up|bull|long/i.test(String(v)), hmS = (t) => (t ? new Date(t * 1000).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }) : '');
      const chip = (k) => { const F = fr[k]; if (!F) return ''; const e = F.last_event, tr = String(F.trend || '—');
        return `<li><b>${esc(k)}</b><span class="lv-pill ${up(tr) ? 'lv-ok' : /down|bear|short/i.test(tr) ? 'lv-no' : ''}">${esc(tr)}</span>${e ? `<small>${esc(e.kind || 'BOS')} ${up(e.dir) ? '▲' : '▼'} ${fmtPx(e.price)}${e.t ? ' · ' + hmS(e.t) : ''}</small>` : '<small>no break yet</small>'}</li>`; };
      const z = st.zone, pools = (Array.isArray(st.pools) ? st.pools : []).filter((p) => p && !p.swept && p.price != null);
      const bsl = pools.filter((p) => /^b/i.test(p.side || '')).sort((a, b) => a.price - b.price)[0], ssl = pools.filter((p) => /^s/i.test(p.side || '')).sort((a, b) => b.price - a.price)[0];
      out.push(`<article class="lv-card lv-struct" style="--c:${col('structure')}"><header><i></i><b>Market structure</b><span class="lv-pill">${esc(z ? (z.premium ? 'in premium' : 'in discount') : 'structure')}</span></header>
        ${st.summary ? `<p class="lv-head">${esc(st.summary)}</p>` : ''}<ul class="lv-frames">${['5m', '15m', '1h'].map(chip).join('')}</ul>
        ${z && z.lo != null && z.hi != null ? `<p class="small">Range ${fmtPx(z.lo)} – ${fmtPx(z.hi)} · equilibrium ${fmtPx(z.eq != null ? z.eq : (z.lo + z.hi) / 2)}</p>` : ''}
        ${(() => { const ps = st.per_strategy && typeof st.per_strategy === 'object' ? st.per_strategy : {}, nm = { lit: 'Zlarior', atlas: 'ATLAS', scalp: 'BLITZ', blitz: 'BLITZ' };
          const rows = Object.entries(ps).map(([k, v]) => [nm[k] || k, typeof v === 'string' ? v : v && typeof v === 'object' ? (v.text || v.note || v.summary || v.headline || '') : '']).filter((r) => r[1]);
          return rows.length ? `<ul class="lv-frames lv-ps">${rows.map(([n, t]) => `<li><b>${esc(n)}</b><small>${esc(String(t).slice(0, 160))}</small></li>`).join('')}</ul>` : ''; })()}
        ${bsl || ssl ? `<p class="small">Liquidity: ${bsl ? `buy side ${fmtPx(bsl.price)}${bsl.label ? ' (' + esc(bsl.label) + ')' : ''}` : ''}${bsl && ssl ? ' · ' : ''}${ssl ? `sell side ${fmtPx(ssl.price)}${ssl.label ? ' (' + esc(ssl.label) + ')' : ''}` : ''}</p>` : ''}</article>`);
    }
    el.innerHTML = out.join('') || '<p class="lv-muted">Switch a strategy on to see what it is thinking.</p>';
  }

  // ------------------------------------------------------------------ feed: glowing ticker (the newest) + the list
  function feed() {
    const ol = q('#lvFeedL'); if (!ol || !L.d) return;
    const all = L.d.narrator || [];
    let rows = all;
    if (L.feedF !== 'all') rows = rows.filter((m) => m.strat === L.feedF);
    if (L.important) rows = rows.filter((m) => m.level !== 'dim');
    const newest = Math.max(0, ...all.map((m) => m.id || 0));
    const fresh = L.seen ? newest > L.seen : false;
    ol.innerHTML = rows.slice(0, 100).map((m) => `<li class="lv-m ${esc(m.level)} ${L.seen && m.id > L.seen ? 'new' : ''}" style="--c:${col(m.strat)}">
      <time class="mono">${esc(m.hm || '')}</time><i></i><div><b>${esc(m.title)}</b> <span>${esc(m.text)}</span></div></li>`).join('') || '<li class="lv-muted" style="padding:6px 10px">Nothing yet today.</li>';
    const tk = all.filter((m) => m.level !== 'dim').slice(0, 8);
    const item = (m) => `<span class="lv-tk ${esc(m.level)}" style="--c:${col(m.strat)}"><i></i><time>${esc(m.hm || '')}</time> <b>${esc(m.title)}</b> ${esc(String(m.text || '').length > 110 ? String(m.text).slice(0, 108) + '…' : m.text || '')}</span>`;
    const sig = tk.map((m) => m.id).join(',');
    if (sig !== L.tickSig) {
      L.tickSig = sig;
      const strip = tk.map(item).join('');
      q('#lvTickR').innerHTML = strip ? strip + strip : '<span class="lv-tk"><b>The bot is quiet</b> nothing important yet today</span>';
      q('#lvTickR').style.animationDuration = `${Math.max(30, tk.length * 9)}s`;
    }
    if (fresh || !L.seen) L.seen = newest;
    const pk = L.d.push_kinds || {};
    const on = Object.values(pk).filter((x) => x.on).map((x) => x.label);
    q('#lvPushes').textContent = on.length ? `phone push: ${on.join(', ')}` : 'phone push: off';
  }
  function countdowns() {
    if (!L.root) return;
    L.root.querySelectorAll('[data-cd]').forEach((s) => { s.textContent = `${s.dataset.l} ${dur(+s.dataset.cd - nowT())}`; });
    top();
  }

  // ------------------------------------------------------------------ the page (#/liveview)
  function view(el) {
    ensureCss();
    if (L.root && L.root.classList.contains('lv-max') && L.root.isConnected) {      // full screen over the app: keep it
      el.innerHTML = '<div class="lv-host"></div>';
      L.home = el.querySelector('.lv-host');
    } else {
      const host = el.querySelector('.lv-host');
      if (!host || !L.root || !host.contains(L.root)) {
        el.innerHTML = '<div class="lv-host"></div>';
        el.querySelector('.lv-host').appendChild(L.root || shell());
      }
    }
    chartMod().then((m) => { drawChart = m.drawChart; drawFx = m.drawFx; paint(); think(); feed(); }).catch(() => { L.err = 'could not load the chart'; top(); });
    top(); banner();
    if (L.d) { think(); feed(); }
    if (!L.timer || Date.now() - L.at > 20000) load(true).then(schedule); else schedule();
    clearInterval(L.tick);
    L.tick = setInterval(() => { if (!active()) { clearInterval(L.tick); L.tick = null; return; } countdowns(); }, 1000);
  }
  VIEWS[ID] = view;
  PAGES[ID] = { id: ID, label: 'Live View', icon: 'chart', desc: 'One big live chart: Zlarior, ATLAS and BLITZ in their own colours, what each bot is thinking, full screen', group: 'chart' };
  const G = typeof GROUPS !== 'undefined' ? GROUPS.find((g) => g.id === 'chart') : null;
  if (G && !G.pages.some((p) => p[0] === ID)) G.pages.unshift([ID, 'Live View', 'chart', PAGES[ID].desc]);
  if (typeof SCENE !== 'undefined') SCENE[ID] = 'chart';
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { live_view: ID, lv: ID, fullscreen: ID, bigchart: ID });

  // ------------------------------------------------------------------ Home: one big button under the account cards and today's plan
  const h0 = VIEWS.today;
  if (h0 && !h0.__lv) {
    const w = function (el) {
      h0.apply(this, arguments);
      try {
        if (el.querySelector('.lv-home')) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'card lv-home'; b.dataset.go = ID;
        b.innerHTML = `<span class="lv-home-i">${typeof icon === 'function' ? icon('chart') : ''}</span><span class="lv-home-t"><b>Live View</b><em>Big live chart · what each bot is thinking · full screen</em></span><span class="lv-home-go">Open ›</span>`;
        const at = el.querySelector('.cl-plan') || el.querySelector('.cl-heroes');   // under the account cards + today's plan (they stay first)
        if (at) at.after(b); else el.insertBefore(b, el.firstChild);
      } catch (e) { console.warn('live view home button', e); }
    };
    Object.keys(h0).forEach((k) => { w[k] = h0[k]; });
    w.__lv = true;
    VIEWS.today = w;
  }
  const hs = document.createElement('style');
  hs.textContent = `.lv-home{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;margin:0 0 12px;border-radius:18px;cursor:pointer;color:#e8eefc;
    border:1px solid rgba(139,92,246,.45);background:radial-gradient(420px 160px at 0% 0%,rgba(56,189,248,.28),transparent 70%),radial-gradient(420px 160px at 100% 100%,rgba(139,92,246,.30),transparent 70%),linear-gradient(135deg,#0b1430,#050816);
    box-shadow:0 14px 34px -14px rgba(139,92,246,.75),inset 0 1px 0 rgba(255,255,255,.08);font:inherit}
  .lv-home-i{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);box-shadow:0 0 18px -4px #8b5cf6;flex:none}
  .lv-home-i svg{width:24px;height:24px;stroke:#fff}
  .lv-home-t{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}.lv-home-t b{font-size:16px;background:linear-gradient(90deg,#7dd3fc,#a78bfa 60%,#f0abfc);-webkit-background-clip:text;background-clip:text;color:transparent}
  .lv-home-t em{font-style:normal;font-size:12.5px;color:#b8c4dc}.lv-home-go{font-weight:700;font-size:13px;color:#7dd3fc;white-space:nowrap}`;
  document.head.appendChild(hs);

  if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(liveview|live_view|lv|fullscreen|bigchart)\b/.test(location.hash)) route(); }
})();
