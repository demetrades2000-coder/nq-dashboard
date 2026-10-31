// Holodeck on the phone (owner 2026-10-29: "a main feature that allows me to see exactly chart fills, very high quality and 3D,
// where I can see what every bot is thinking"; loaded by index.html with one <script defer> AFTER liveview.js; read-only).
// #/holo: one day of NQ in 3D (fx.js holo.js): every fill as a glowing orb at its exact second and price (real = solid in the
// bot's colour, paper / model = hollow, the model price as a ghost next to a real fill), the trades as glass risk / reward
// volumes with the stop stepping to break-even, each LIT setup as an annotated anatomy (1 Sweep -> 2 Inducement ->
// 3 Displacement -> 4 CISD -> 5 Entry), the bots' thoughts as holographic panels, working orders, levels, structure; a
// replay (1x-120x) where the candles build bar by bar and the fills pop exactly when they happened; Live follows the PC.
// The page itself: holocore.js (shared with the PC, byte-identical web_next/js/next/holocore.js) + holo.css.
//   Data   holo.json (today, the PC pushes it next to liveview.json on the branch `live`) and holo_hist.json (past days, the
//          trade windows), read like liveview.js reads liveview.json: GitHub's API first, raw.githubusercontent.com when the
//          API's hourly limit runs low (shared via window.LIVE.apiUntil). holo.json is polled every 30-60 s on Live.
//   3D     fx.js (the 3D layer bundle; FX.holo works with the space background off); no WebGL 2 or quality "2D": the Live
//          View chart (liveviewchart.js) with the fills drawn on it.
//   Entry  a big Home button next to the Live View one, a link on Mission Control, More > Today, #/holo (alias #/holodeck).
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined') return;
  const ID = 'holo';
  const host = location.hostname, seg = location.pathname.split('/').filter(Boolean)[0];
  const OWNER = /\.github\.io$/.test(host) ? host.split('.')[0] : 'demetrades2000-coder';
  const REPO = /\.github\.io$/.test(host) && seg && !/\./.test(seg) ? seg : 'nq-dashboard';
  const API = (f) => `https://api.github.com/repos/${OWNER}/${REPO}/contents/${f}?ref=live`;
  const RAW = (f) => `https://raw.githubusercontent.com/${OWNER}/${REPO}/live/${f}`;
  const okN = (v) => typeof v === 'number' && Number.isFinite(v);
  const H = window.HOLO = { ui: null, cache: {}, at: {}, apiUntil: 0, every: 45, src: null, el: null };
  const st = { get: (k, d) => { try { return store.get(k, d); } catch (e) { return d; } }, set: (k, v) => { try { store.set(k, v); } catch (e) { /* private window */ } } };

  function ensureCss() {
    if (document.querySelector('link[data-hd]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'holo.css?v=112d824e'; l.dataset.hd = '1';
    document.head.appendChild(l);
  }
  ensureCss();
  async function get(url, opts) { const r = await fetch(url, opts); if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; e.r = r; throw e; } return r; }
  // the live branch file: GitHub's API first (fresh), raw.githubusercontent.com when its hourly limit runs low
  async function fetchFile(f, kind) {
    const LV = window.LIVE || {};
    let r = null;
    if (Date.now() >= (LV.apiUntil || 0) && Date.now() >= (H.apiUntil || 0) && Date.now() >= ((window.LVP && window.LVP.apiUntil) || 0)) {
      try {
        r = await get(API(f), { cache: 'no-cache', headers: { Accept: 'application/vnd.github.raw+json' } });
        const rem = +r.headers.get('x-ratelimit-remaining'), reset = +r.headers.get('x-ratelimit-reset');
        if (okN(rem)) { H.every = rem > 30 ? 30 : 60; if (rem <= 12) H.apiUntil = okN(reset) && reset > 0 ? reset * 1000 : Date.now() + 15 * 60e3; }
        H.src = 'api';
      } catch (e) {
        r = null;
        const h = e.r && e.r.headers, reset = h ? +h.get('x-ratelimit-reset') : NaN;
        if (e.status === 403 || e.status === 429 || !e.status) H.apiUntil = okN(reset) && reset > 0 ? reset * 1000 : Date.now() + 15 * 60e3;
        else if (e.status === 404) H.apiUntil = Date.now() + 5 * 60e3;
      }
    }
    if (!r) {
      H.src = 'raw';
      try { r = await get(RAW(f) + '?t=' + Date.now(), { cache: 'no-store' }); }
      catch (e) { if (e.status === 404) throw new Error('the PC has not sent the Holodeck yet'); throw e; }
    }
    let j = await r.json();
    if (j && j.encoding === 'base64' && typeof j.content === 'string') {
      const bin = atob(j.content.replace(/\s/g, '')), u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      j = JSON.parse(new TextDecoder().decode(u8));
    }
    if (!j || j.kind !== kind) throw new Error('not a ' + f);
    H.cache[f] = j; H.at[f] = Date.now();
    return j;
  }
  const hist = async (maxAge) => (H.cache['holo_hist.json'] && Date.now() - H.at['holo_hist.json'] < maxAge ? H.cache['holo_hist.json'] : fetchFile('holo_hist.json', 'le-holo-hist'));
  async function getDay(day) {
    if (!day && H.want) { day = H.want; H.want = null; }      // #/holo/<day> (a replay link): the first load opens that day
    const today = await fetchFile('holo.json', 'le-holo').catch((e) => { if (!day) throw e; return H.cache['holo.json'] || null; });
    if (!day || (today && today.day === day)) return today;
    const h = await hist(5 * 60e3), D = (h.days || []).find((x) => x.day === day);
    if (!D) throw new Error('no Holodeck data for ' + day);
    // holo_hist.json (engine/holo_api.hist): each trade carries its own fills and thoughts, the day its bar window
    // (bars_1m, or bars_5m once trimmed); the older flat shape (fills / thoughts / bars per day) still reads
    const T = D.trades || [], seen = new Set();
    const thoughts = (D.thoughts || T.flatMap((t) => t.thoughts || [])).filter((x) => { const k = x.key || (x.t + '|' + x.bot + '|' + x.title); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.t - b.t);
    const bars = D.bars || { '1m': D.bars_1m || [], '5m': D.bars_5m || [] };
    return { v: 1, kind: 'le-holo', t: h.t, day: D.day, live: false, bars, bots: (today && today.bots) || null, fills: D.fills || T.flatMap((t) => t.fills || []).sort((a, b) => a.t - b.t),
      trades: T, orders: D.orders || [], thoughts, levels: D.levels || [], structure: D.structure || null, now: null, trimmed: !!h.trimmed };
  }
  async function getDays() {
    const h = await hist(5 * 60e3).catch(() => ({ days: [] }));
    const sum = (L) => L.reduce((a, t) => a + (okN(t.usd) ? t.usd : 0), 0);
    return (h.days || []).map((x) => ({ day: x.day, trades: (x.trades || []).length, usd: okN(x.usd) ? x.usd : sum(x.trades || []) })).sort((a, b) => (a.day < b.day ? 1 : -1));
  }
  const FXV_ = () => (typeof FXV !== 'undefined' ? FXV : '');
  const env = {
    platform: 'phone', store: st, every: 45,
    loadFX: () => import('./fx.js?v=' + FXV_()),
    loadChart: () => import('./liveviewchart.js?v=2'),
    getDay, getDays,
    quality: st.get('fx', 'max') === 'lite' ? 'lite' : 'max',
  };
  Object.defineProperty(env, 'every', { get: () => H.every });
  let core = null;
  const coreMod = () => core || (core = import('./holocore.js?v=293f5166').catch((e) => { core = null; throw e; }));

  // ------------------------------------------------------------------ the page (#/holo)
  function view(el) {
    const want = typeof ARG !== 'undefined' && /^\d{4}-\d\d-\d\d$/.test(String(ARG || '')) ? String(ARG) : null;   // #/holo/2026-10-13
    if (want) { H.want = want; if (H.ui) H.ui.state.pickedDay = want; }
    el.innerHTML = '<div class="hd-host"></div>';
    const hostEl = el.querySelector('.hd-host');
    if (H.ui && H.ui.root.classList.contains('hd-max') && H.ui.root.isConnected) return;     // full screen over the app: keep it
    if (H.ui) { hostEl.appendChild(H.ui.root); H.ui.resume(); H.want = null; H.ui.load(H.ui.state.pickedDay || null); return; }
    hostEl.innerHTML = '<div class="card"><b>Holodeck</b><p class="mut">Loading the 3D deck…</p></div>';
    coreMod().then((m) => {
      if (!hostEl.isConnected) return;
      hostEl.innerHTML = '';
      H.ui = m.mountHolodeck(hostEl, env);
      if (want) H.ui.state.pickedDay = want;
    }).catch(() => { hostEl.innerHTML = '<div class="card"><b>Holodeck</b><p class="mut">Could not load the Holodeck. Pull down to refresh.</p></div>'; });
  }
  addEventListener('hashchange', () => setTimeout(() => {
    if (typeof PAGE === 'undefined' || PAGE === ID || !H.ui) return;
    if (H.ui.root.classList.contains('hd-max')) H.ui.maxOff();
    if (document.fullscreenElement === H.ui.root) Promise.resolve(document.exitFullscreen()).catch(() => null);
    H.ui.pause();
  }, 0));
  VIEWS[ID] = view;
  PAGES[ID] = { id: ID, label: 'Holodeck', icon: 'chart', desc: 'The day in 3D: every fill at its exact second and price, the trades as glass volumes, each setup drawn step by step, what every bot is thinking, replay', group: 'chart' };
  const add = (gid, front) => {
    const G = typeof GROUPS !== 'undefined' ? GROUPS.find((g) => g.id === gid) : null;
    if (!G || G.pages.some((p) => p[0] === ID)) return;
    const i = G.pages.findIndex((p) => p[0] === 'liveview');
    const row = [ID, 'Holodeck', 'chart', PAGES[ID].desc];
    if (i >= 0) G.pages.splice(i + 1, 0, row); else if (front) G.pages.unshift(row); else G.pages.push(row);
  };
  add('chart', true); add('today', false);
  if (typeof SCENE !== 'undefined') SCENE[ID] = 'chart';
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { holodeck: ID, deck: ID, '3d': ID, fills: ID });

  // ------------------------------------------------------------------ Home: a big button next to the Live View one
  const btn = () => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card hd-home'; b.dataset.go = ID;
    b.innerHTML = '<span class="hd-home-i">3D</span><span class="hd-home-t"><b>Holodeck</b><em>Every fill exact · trades in 3D · what each bot is thinking · replay</em></span><span class="hd-home-go">Open ›</span>';
    return b;
  };
  const h0 = VIEWS.today;
  if (h0 && !h0.__hd) {
    const w = function (el) {
      h0.apply(this, arguments);
      try {
        if (el.querySelector('.hd-home')) return;
        const at = el.querySelector('.lv-home') || el.querySelector('.cl-plan') || el.querySelector('.cl-heroes');
        if (at) at.after(btn()); else el.insertBefore(btn(), el.firstChild);
      } catch (e) { console.warn('holodeck home button', e); }
    };
    Object.keys(h0).forEach((k) => { w[k] = h0[k]; });
    w.__hd = true; w.__lv = h0.__lv;
    VIEWS.today = w;
  }
  // Mission Control: a link at the top (the page redraws itself every 30 s, so the link is put back when it goes)
  const m0 = VIEWS.mission;
  if (m0 && !m0.__hd) {
    const w = function (el) {
      m0.apply(this, arguments);
      const put = () => { if (!el.querySelector('.hd-home')) { const b = btn(); b.classList.add('hd-mc'); b.querySelector('em').textContent = 'Watch the day in 3D: every fill, trade and thought'; el.insertBefore(b, el.firstChild); } };
      try { put(); if (!el.__hdObs) { el.__hdObs = new MutationObserver(() => { if (typeof PAGE !== 'undefined' && PAGE === 'mission') put(); }); el.__hdObs.observe(el, { childList: true }); } } catch (e) { console.warn('holodeck mission link', e); }
    };
    Object.keys(m0).forEach((k) => { w[k] = m0[k]; });
    w.__hd = true;
    VIEWS.mission = w;
  }

  if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(holo|holodeck|deck|3d|fills)\b/.test(location.hash)) route(); }
})();
