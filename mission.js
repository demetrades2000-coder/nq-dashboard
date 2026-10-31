// Mission Control on the phone (2026-10-29; loaded by index.html with one <script defer> AFTER missioncore.js; read-only).
//   Home        the Mission Control strip at the top: the three accounts as orbit chips (Zlarior 50K, ATLAS 25K, BLITZ 25K),
//               today's mission (one line per bot), the next-session countdown; a tap opens the page
//   #/mission   the whole page (missioncore.js MissionUI.page): orbits with every number, today's mission, and the
//               features: if it stops out now, why no trade yet, session timeline, alerts center, health constellation,
//               eval runway, streaks & consistency, daily loss & week pace, next news. Also in More > Today.
//   3D          MissionSync.fx(): the deep-space satellites follow each bot (armed / in a trade), a shooting star for
//               every newly closed trade (green win / red loss), the aurora follows today's real P&L (fx.js FX.bots /
//               FX.shoot / FX.pnl). Runs after every data load and every 30 s.
// Data: data.json / home.json "board" or live.json "board" when newer (the same rule as board.js), liveview.json when the
// Live View page loaded it (window.LVP.d: BLITZ's thinking line + the feed), data.json goals.calendar (news), live.last_run.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined' || !window.MissionUI) return;
  const ID = 'mission', MU = window.MissionUI;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const T = (b) => (b ? +b.data_t || +b.t || 0 : 0);
  function board() {
    const h = HD() || {}, b = h.board && !h.board.error ? h.board : null;
    const L = window.LIVE && window.LIVE.j && window.LIVE.j.board && !window.LIVE.j.board.error ? window.LIVE.j.board : null;
    if (!L || (b && T(b) > T(L))) return b;
    if (!b) return L;
    const m = new Map();
    for (const t of (b.trades || []).concat(L.trades || [])) if (t) m.set(`${t.acct}|${t.entry_t || t.day}|${t.src}`, t);
    return { ...L, trades: [...m.values()].sort((x, y) => (+y.entry_t || 0) - (+x.entry_t || 0)) };
  }
  // the day's news as unix times (goals.calendar.news rows: { day, time 'HH:MM', event })
  function news() {
    const h = HD() || {}, ev = h.news && Array.isArray(h.news.events) ? h.news.events : null;
    if (ev && ev.length) return ev.filter((e) => e && +e.t && /high|medium|fomc/i.test(String(e.impact || e.kind || ''))).map((e) => ({ t: +e.t, title: e.title, impact: String(e.impact || 'high').toLowerCase() }));
    const cal = (h.goals || {}).calendar || {}, out = [];
    for (const n of cal.news || []) {
      const m = String(n.time || '').match(/(\d\d?):(\d\d)/); if (!m || !n.day) continue;
      const guess = Date.parse(`${n.day}T${m[1].padStart(2, '0')}:${m[2]}:00-05:00`) / 1000;      // EST; fixed below for EDT
      const off = new Date(guess * 1000).toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false });
      const t = guess - ((+off % 24) - +m[1]) * 3600;
      if (Number.isFinite(t)) out.push({ t, title: n.event || n.title || 'news', impact: n.impact || 'high' });
    }
    return out;
  }
  function model() {
    const h = HD() || {};
    return { now: Date.now() / 1000, board: board(), lv: (window.LVP && window.LVP.d) || null, news: news(), cloud: h.live && h.live.last_run ? { t: +h.live.last_run } : null, where: 'phone' };
  }
  const go = (id) => `data-go="${id}"`;

  // ------------------------------------------------------------------ 3D sync
  const seenKey = 'le.mc.seen';
  function seenGet() { try { return JSON.parse(localStorage.getItem(seenKey) || 'null'); } catch (e) { return null; } }
  function seenSet(v) { try { localStorage.setItem(seenKey, JSON.stringify(v)); } catch (e) { /* private window */ } }
  const Sync = window.MissionSync = {
    pnl() {
      const M = model(); if (!M.board) return null;
      const A = MU.accounts(M).filter((a) => !a.placeholder && typeof a.today === 'number');
      return A.length ? A.reduce((s, a) => s + a.today, 0) : null;
    },
    fx() {
      const F = typeof FX !== 'undefined' ? FX : null;
      if (!F || !F.bots) return;
      const M = model(); if (!M.board) return;
      try {
        F.bots(MU.botStates(M));
        const p = Sync.pnl(); if (typeof p === 'number') F.pnl(p);
        const C = MU.closed(M), ids = C.map((c) => c.id), seen = seenGet();
        if (!seen) { seenSet(ids.slice(0, 40)); return; }                       // first run: remember, no stars
        const fresh = C.filter((c) => !seen.includes(c.id) && Date.now() / 1000 - c.t < 6 * 3600).slice(0, 3);
        fresh.forEach((c, i) => setTimeout(() => F.shoot((c.usd || 0) >= 0 ? 'win' : 'loss'), 400 + i * 1400));
        if (fresh.length) seenSet([...new Set(ids.concat(seen))].slice(0, 60));
      } catch (e) { console.warn('mission 3D sync', e); }
    },
    model,
  };
  setInterval(() => { if (!document.hidden) Sync.fx(); }, 30000);

  // ------------------------------------------------------------------ the page
  let tmr = null;
  function view(el) {
    const draw = () => {
      const M = model();
      el.innerHTML = M.board ? MU.page(M, { go }) : `<div class="card"><b>Mission Control</b><p class="mut">Waiting for the first board from the cloud monitor or the PC (data.json / live.json).</p></div>`;
      MU.wire(el);
    };
    draw();
    // BLITZ's thinking line and the bot's feed live in liveview.json: fetch it once (Live View's own loader) when not loaded yet
    const LV = window.LVP;
    if (LV && !LV.d && typeof LV.load === 'function' && !LV.busy) Promise.resolve(LV.load(true)).then(() => { if (LV.d && PAGE === ID && el.isConnected) draw(); }).catch(() => null);
    clearInterval(tmr);
    tmr = setInterval(() => { if (typeof PAGE === 'undefined' || PAGE !== ID || !el.isConnected) { clearInterval(tmr); tmr = null; return; } if (!document.hidden && !el.querySelector('details[open]:hover')) draw(); }, 30000);
    Sync.fx();
  }
  VIEWS[ID] = view;
  PAGES[ID] = { id: ID, label: 'Mission Control', icon: 'target', desc: 'The three bots in orbit: every account, today\'s mission, if it stops out now, why no trade yet, session timeline, alerts, health', group: 'today' };
  const G = typeof GROUPS !== 'undefined' ? GROUPS.find((g) => g.id === 'today') : null;
  if (G && Array.isArray(G.pages) && !G.pages.some((p) => p[0] === ID)) G.pages.unshift([ID, 'Mission Control', 'target', PAGES[ID].desc]);
  if (typeof SCENE !== 'undefined') SCENE[ID] = 'today';
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { mc: ID, missioncontrol: ID, orbit: ID });

  // ------------------------------------------------------------------ Home: the strip on top
  const h0 = VIEWS.today;
  if (h0 && !h0.__mc) {
    const w = function (el) {
      h0.apply(this, arguments);
      try {
        const M = model(); if (!M.board) return;
        el.querySelector('.mc-strip')?.remove();
        const box = document.createElement('div'); box.innerHTML = MU.strip(M, { go });
        el.insertBefore(box.firstElementChild, el.firstChild);      // Home's top area
        // real.js prepends its cards once realcore.js has loaded (async on the first render): keep the strip on top
        if (!el.__mcTop && typeof MutationObserver !== 'undefined') {
          el.__mcTop = new MutationObserver(() => { const s = el.querySelector(':scope > .mc-strip'); if (s && el.firstElementChild !== s) el.prepend(s); });
          el.__mcTop.observe(el, { childList: true });
        }
        MU.wire(el);
      } catch (e) { console.warn('mission strip', e); }
      Sync.fx();
    };
    Object.keys(h0).forEach((k) => { w[k] = h0[k]; });
    w.__mc = true;
    VIEWS.today = w;
  }
  // More > What's new (features.js): the deep-space / Mission Control features, marked new
  try {
    const FL = window.Features && Array.isArray(window.Features.list) ? window.Features.list : null;
    if (FL && !FL.some((f) => f.group === 'Deep space & Mission Control')) {
      const go = { space: 'settings', today: 'today', session: 'today' };
      MU.FEATURES.slice().reverse().forEach(([k, name, line]) => FL.unshift({ group: 'Deep space & Mission Control', name, line: line.charAt(0).toUpperCase() + line.slice(1) + '.', go: go[k] || ID, isNew: true }));
      window.Features.count = FL.length; window.Features.newCount = FL.filter((f) => f.isNew).length;
    }
  } catch (e) { /* the list is optional */ }
  if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(mission|mc|missioncontrol|orbit)\b/.test(location.hash)) route(); }
  if (typeof render === 'function' && typeof PAGE !== 'undefined' && PAGE === 'today' && HD()) render(true);
})();
