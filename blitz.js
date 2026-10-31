// BLITZ tab + Mind + Trader's deck on the phone (2026-10-29; loaded by index.html with one <script defer> each, LAST:
// blitzcore.js, mindcore.js, deckcore.js, then this file; read-only: it never arms, routes or changes the bot).
//   #/blitz/<part>  the BLITZ bottom tab (clean.js makes the tab and its section bar: Today · Brain · Trades · Results ·
//                   Rules · Go live); renderer blitzcore.js (BlitzUI.page)
//   #/mind          the Mind (Brain v2): regime, each bot's game plan, similar past setups, A-F reviews, research ideas,
//                   alerts, IQ (mindcore.js); its cards also sit on the Zlarior Bot Brain, ATLAS > Brain, BLITZ > Brain and
//                   Home (compact); nothing is drawn while the bot sends no Mind block
//   #/deck          Trader's deck (deckcore.js): risk meter, next 24 h, eval odds from today's balance, real P&L calendar,
//                   trade journal, notification center (mute per bot), since you last looked, Holodeck replays
//   Home            + "since you last looked", the risk meter, the next 24 h (compact) and the Mind card, after the hero cards
//   Mission Control + "Replay a day in the Holodeck" (#/holo/<day>)
// Data: data.json "blitz" (engine/blitz.card from the cloud monitor), live.json (window.LIVE.j: pc.account_c, board, mind),
// liveview.json (window.LVP.d: strategies.scalp = BLITZ's live layer, mind, the feed; fetched once with Live View's loader),
// data.json board / goals.calendar / news.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined' || !window.BlitzUI) return;
  const BU = window.BlitzUI, MU = window.MindUI, DU = window.DeckUI;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const LJ = () => (window.LIVE && window.LIVE.j) || null;
  const LV = () => (window.LVP && window.LVP.d) || null;
  const go = (id, arg) => `data-go="${esc(id)}"${arg ? ` data-arg="${esc(arg)}"` : ''}`;
  const T = (b) => (b ? +b.data_t || +b.t || 0 : 0);
  function board() {          // data.json / home.json "board", or live.json's when newer (the rule of board.js / mission.js)
    const h = HD() || {}, b = h.board && !h.board.error ? h.board : null, j = LJ(), L = j && j.board && !j.board.error ? j.board : null;
    if (!L || (b && T(b) > T(L))) return b;
    if (!b) return L;
    const m = new Map();
    for (const t of (b.trades || []).concat(L.trades || [])) if (t) m.set(`${t.acct}|${t.entry_t || t.day}|${t.src}`, t);
    return { ...L, trades: [...m.values()].sort((x, y) => (+y.entry_t || 0) - (+x.entry_t || 0)) };
  }
  function mind() {
    const v = LV(), j = LJ(), h = HD() || {};
    const c = [v && v.mind, j && j.mind, j && j.pc && j.pc.mind, h.mind, h.live && h.live.pc && h.live.pc.mind].filter((x) => MU && MU.has(x));
    return c.sort((a, b) => (+b.t || 0) - (+a.t || 0))[0] || null;
  }
  function acctC() {
    const j = LJ(), h = HD() || {};
    return (j && j.pc && j.pc.account_c) || (h.live && h.live.pc && h.live.pc.account_c) || null;
  }
  function news() {
    const h = HD() || {}, ev = h.news && Array.isArray(h.news.events) ? h.news.events : null;
    if (ev && ev.length) return ev.filter((e) => e && +e.t).map((e) => ({ t: +e.t, title: e.title, impact: String(e.impact || 'high').toLowerCase() }));
    return [];
  }
  const bModel = () => {
    const h = HD() || {}, B = board();
    return BU.model({ now: Date.now() / 1000, where: 'phone', lv: LV(), card: h.blitz || null, ac: acctC(), board: B && B.blitz, preflight: h.blitz_preflight || null });
  };
  const dModel = () => ({ now: Date.now() / 1000, where: 'phone', board: board(), lv: LV(), mind: mind(), news: news(), cal: ((HD() || {}).goals || {}).calendar || null, acc: acctC() });
  // polish.js (the status bar, the account cards, the palette) reads the same data the BLITZ tab reads
  window.PhoneData = { board, mind, acctC, news, bModel, dModel };
  // Live View's loader fetches liveview.json (BLITZ's layer, the Mind, the feed) once when no page has loaded it yet
  function needLv(redraw) {
    const L = window.LVP;
    if (L && !L.d && typeof L.load === 'function' && !L.busy) Promise.resolve(L.load(true)).then(() => { if (L.d) redraw(); }).catch(() => null);
  }
  function pics() {
    const T_ = window.TradePics, ch = (HD() || {}).charts;
    if (!T_ || !ch || typeof T_.list !== 'function') return '';
    let L = []; try { L = T_.list(ch, 'blitz') || []; } catch (e) { L = []; }
    return L.length ? `<section class="bl-card"><div class="bl-h"><h3>Trade pictures · BLITZ</h3><span class="bl-meta">tap for full screen</span></div>${T_.strip(L.slice(0, 12), { label: 'BLITZ trade pictures' })}</section>` : '';
  }
  // a page that redraws itself every 30 s while it is on screen
  function live(id, draw) {
    return function (el) {
      const paint = () => { try { draw(el); } catch (e) { console.warn(id, e); el.innerHTML = `<div class="card"><b>Could not draw this page.</b><p class="mut">${esc(e.message)}</p></div>`; } };
      paint();
      needLv(() => { if (typeof PAGE !== 'undefined' && PAGE === id && el.isConnected) paint(); });
      clearInterval(el.__t);
      // the 30 s redraw waits while a fold is open (an idea's evidence, the Advanced list): it would close it under the finger
      el.__t = setInterval(() => { if (typeof PAGE === 'undefined' || PAGE !== id || !el.isConnected) { clearInterval(el.__t); return; } if (!document.hidden && !el.querySelector('details[open]')) paint(); }, 30000);
    };
  }

  // ------------------------------------------------------------------ the BLITZ tab
  const PARTS = BU.PARTS.map((p) => p[0]);
  VIEWS.blitz = live('blitz', (el) => {
    const part = typeof ARG !== 'undefined' && PARTS.includes(ARG) ? ARG : 'today';
    const M = bModel();
    el.innerHTML = BU.page(M, part, { go, mind: part === 'brain' && MU ? MU.bot(mind(), 'blitz', { go }) : '', pics: part === 'trades' ? pics() : '' });
    BU.wire(el);
    if (part === 'trades' && window.TradePics && window.TradePics.settle) { try { window.TradePics.settle(el); } catch (e) { /* pictures are optional */ } }
  });
  const desc = 'BLITZ, the scalper, on its own 25K: today, brain, trades, results, rules, go live';
  PAGES.blitz = Object.assign(PAGES.blitz || {}, { id: 'blitz', label: 'BLITZ', icon: 'blitz', desc, group: 'blitz' });
  if (typeof P !== 'undefined' && !P.blitz) P.blitz = '<path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z"/>';
  if (typeof SCENE !== 'undefined') SCENE.blitz = 'eval';
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { scalp: 'blitz', scalper: 'blitz', strategy3: 'blitz', bot3: 'blitz', acctc: 'blitz', account_c: 'blitz' });

  // ------------------------------------------------------------------ Mind + Trader's deck pages (Home group, More > Today)
  if (MU) {
    VIEWS.mind = live('mind', (el) => { el.innerHTML = MU.page(mind(), { go }); });
    PAGES.mind = { id: 'mind', label: 'Mind', icon: 'brain', desc: 'Brain v2: market regime, each bot\'s if-then game plan, similar past setups, A-F trade reviews, research ideas', group: 'today' };
    if (typeof SCENE !== 'undefined') SCENE.mind = 'today';
    if (typeof ALIAS !== 'undefined') { delete ALIAS.mind; Object.assign(ALIAS, { brain2: 'mind', reviews: 'mind', ideas: 'mind', proposals: 'mind' }); }   // #/mind was an alias of the Bot Brain: now its own page
  }
  if (DU) {
    VIEWS.deck = live('deck', (el) => {
      const M = dModel();
      el.innerHTML = DU.page(M, { go });
      DU.wire(el, () => { el.innerHTML = DU.page(dModel(), { go }); });
    });
    PAGES.deck = { id: 'deck', label: 'Trader\'s deck', icon: 'layers', desc: 'Risk meter on all accounts, the next 24 h, eval odds from today\'s balance, real P&L calendar, trade journal, notification center, Holodeck replays', group: 'today' };
    if (typeof SCENE !== 'undefined') SCENE.deck = 'today';
    if (typeof ALIAS !== 'undefined') { delete ALIAS.deck; Object.assign(ALIAS, { risk24: 'deck', inbox: 'deck', next24: 'deck', odds: 'deck', tdeck: 'deck' }); }   // #/deck was an alias of the Holodeck (#/holo, #/holodeck stay)
  }
  const G = typeof GROUPS !== 'undefined' ? GROUPS.find((g) => g.id === 'today') : null;
  if (G) for (const id of ['deck', 'mind']) if (PAGES[id] && !G.pages.some((p) => p[0] === id)) G.pages.splice(Math.min(1, G.pages.length), 0, [id, PAGES[id].label, PAGES[id].icon, PAGES[id].desc]);

  // ------------------------------------------------------------------ Home: the digest, the risk meter, the next 24 h, the Mind
  const h0 = VIEWS.today;
  if (h0 && !h0.__bz) {
    const w = function (el) {
      h0.apply(this, arguments);
      try {
        el.querySelectorAll(':scope > .bz-home').forEach((x) => x.remove());
        const box = document.createElement('div'); box.className = 'bz-home';
        const M = dModel();
        box.innerHTML = (DU ? DU.home(M, { go }) : '') + (MU ? MU.home(M.mind, { go }) : '');
        const at = el.querySelector(':scope > .cl-list');                // before "One tap away" (the hero cards stay first)
        if (at) el.insertBefore(box, at); else el.appendChild(box);
        if (DU && !w.__seen) { w.__seen = true; setTimeout(() => DU.markSeen(Date.now() / 1000), 8000); }   // "last looked" = this visit, after a moment
        // Home never fetches liveview.json itself (the GitHub API's hourly budget is shared with live.json / the Holodeck): the
        // Mind card shows from live.json / data.json, or from liveview.json once the BLITZ tab, Live View or the Mind page loaded it
      } catch (e) { console.warn('blitz home cards', e); }
    };
    Object.keys(h0).forEach((k) => { w[k] = h0[k]; });
    w.__bz = true;
    VIEWS.today = w;
  }
  // ------------------------------------------------------------------ Mind on the Zlarior Bot Brain and on ATLAS > Brain
  const b0 = VIEWS.brain;
  if (b0 && MU && !b0.__mind) {
    const w = function (el) { b0.apply(this, arguments); try { const h = MU.bot(mind(), 'lit', { go }); if (h) el.insertAdjacentHTML('afterbegin', `<div class="bz-mind">${h}</div>`); } catch (e) { console.warn('mind lit', e); } };
    Object.keys(b0).forEach((k) => { w[k] = b0[k]; }); w.__mind = true; VIEWS.brain = w;
  }
  const a0 = VIEWS.atlas;
  if (a0 && MU && !a0.__mind) {
    const w = function (el) {
      a0.apply(this, arguments);
      try { if (typeof ARG !== 'undefined' && ARG === 'brain') { const h = MU.bot(mind(), 'atlas', { go }), r = el.querySelector('#atRoot'); if (h && r) r.insertAdjacentHTML('afterbegin', `<div class="bz-mind" data-at="brain">${h}</div>`); } } catch (e) { console.warn('mind atlas', e); }
    };
    Object.keys(a0).forEach((k) => { w[k] = a0[k]; }); w.__mind = true; VIEWS.atlas = w;
  }
  // ------------------------------------------------------------------ Mission Control: replay links into the Holodeck
  const m0 = VIEWS.mission;
  if (m0 && DU && !m0.__rp) {
    const w = function (el) { m0.apply(this, arguments); try { el.querySelectorAll('.bz-rp').forEach((x) => x.remove()); el.insertAdjacentHTML('beforeend', `<div class="bz-rp">${DU.replays(dModel(), { go })}</div>`); } catch (e) { console.warn('mission replays', e); } };
    Object.keys(m0).forEach((k) => { w[k] = m0[k]; }); w.__rp = true; VIEWS.mission = w;
  }
  // More > What's new
  try {
    const FL = window.Features && Array.isArray(window.Features.list) ? window.Features.list : null;
    if (FL && !FL.some((f) => f.group === 'BLITZ, Mind & Trader\'s deck')) {
      [['blitz', 'BLITZ tab', 'BLITZ, the scalper, in its own tab: today\'s noise band, the day filter, signals, the open position with $ at the stop, account C, brain, trades, results vs the research band, the kill switch, rules, go live'],
        ['mind', 'Mind', 'Each bot\'s if-then game plan, similar past setups, A-F trade reviews and research ideas (once the bot sends them)'],
        ['deck', 'Trader\'s deck', 'Risk meter on all accounts, the next 24 h with the clock change, eval odds from today\'s balance, real P&L calendar, trade journal, notification center with a mute per bot'],
      ].reverse().forEach(([go_, name, line]) => FL.unshift({ group: 'BLITZ, Mind & Trader\'s deck', name, line: line + '.', go: go_, isNew: true }));
      window.Features.count = FL.length; window.Features.newCount = FL.filter((f) => f.isNew).length;
    }
  } catch (e) { /* the list is optional */ }
  const st = document.createElement('style'); st.id = 'blitz-phone-css';
  st.textContent = '.bz-home{display:flex;flex-direction:column;gap:12px;margin:0 0 12px}.bz-mind{margin:0 0 12px}.bz-rp{margin-top:12px}';
  document.head.appendChild(st);
  if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(blitz|scalp|scalper|mind|deck|bot3|strategy3)\b/.test(location.hash)) route(); }
  if (typeof render === 'function' && typeof PAGE !== 'undefined' && (PAGE === 'today' || PAGE === 'brain' || PAGE === 'mission') && HD()) render(true);
})();
