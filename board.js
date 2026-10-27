// Live board (phone, 2026-10-26; loaded by index.html with one <script defer> AFTER clean.js; read-only).
//   Home        a "Right now" cut under the two account cards: what each bot waits for, the next entry window counting
//               down, Zlarior's size now, anything blocking entries (red, with the fix), the bot health strip
//   #/board     the whole board: Right now per account, health strip, today's map (LIT levels, VIX objective, 18:00
//               open, points and $ per micro), week and eval progress (odds, $ a month expected vs actual), the trade log
//               of both accounts with pictures and a CSV export
// Data: data.json / home.json "board" (engine/live_board.site_block, the cloud's copy of the PC heartbeat) and, when newer,
// live.json "board" (engine/live_publish.py, from the PC every 60 s; window.LIVE.j). Renderer: boardcore.js
// (window.BoardUI, byte-identical to web_next/js/next/boardcore.js). Nothing here changes the bot.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined') return;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const T = (b) => (b ? +b.data_t || +b.t || 0 : 0);
  // the freshest board: live.json (the PC, every 60 s) else the site's; live.json carries few trades, so the site's list stays
  function board() {
    const h = HD() || {}, b = h.board && !h.board.error ? h.board : null;
    const L = window.LIVE && window.LIVE.j && window.LIVE.j.board && !window.LIVE.j.board.error ? window.LIVE.j.board : null;
    if (!L || (b && T(b) > T(L))) return b;
    if (!b) return L;
    const m = new Map();
    for (const t of (b.trades || []).concat(L.trades || [])) if (t) m.set(`${t.acct}|${t.entry_t || t.day}|${t.src}`, t);
    return { ...L, trades: [...m.values()].sort((x, y) => (+y.entry_t || 0) - (+x.entry_t || 0)) };
  }
  let loading = null;
  function core(cb) {
    if (window.BoardUI) return cb();
    if (!loading) {
      loading = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'boardcore.js?v=1'; s.onload = ok; s.onerror = () => { loading = null; bad(); }; document.head.appendChild(s); });
    }
    loading.then(cb).catch(() => null);
  }
  const opts = () => ({ charts: (HD() || {}).charts, where: 'phone', go: (id) => `data-go="${id}"` });
  let timer = null;
  function view(el) {
    el.innerHTML = head('Home · live', 'Live board', 'Right now on both accounts, today\'s map, the bot\'s health, the week and the eval, and every trade with its picture. Read-only.')
      + '<div id="bdRoot"><div class="skel" style="height:220px"></div></div>';
    const draw = () => {
      const r = el.querySelector('#bdRoot'); if (!r || !window.BoardUI) return;
      const B = board();
      r.innerHTML = window.BoardUI.page(B, opts());
      window.BoardUI.wire(r, B, opts());
    };
    core(draw);
    clearInterval(timer);                  // live.json lands every 30-60 s (live.js); redraw while this page is open
    let last = T(board());
    timer = setInterval(() => {
      if (typeof PAGE !== 'undefined' && PAGE !== 'board') { clearInterval(timer); return; }
      const t = T(board()); if (t !== last && !document.querySelector('.tp-lb.on')) { last = t; draw(); }
    }, 15000);
  }
  VIEWS.board = view;
  PAGES.board = { id: 'board', label: 'Live board', icon: 'radar', desc: 'Right now per account, today\'s map, bot health, week and eval odds, every trade with its picture', group: 'today' };
  if (typeof SCENE !== 'undefined') SCENE.board = 'today';
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { now: 'board', rightnow: 'board', live_board: 'board', map: 'board' });
  // Home (clean.js): the Right now cut right under the two account cards
  const h0 = VIEWS.today;
  if (h0 && !h0.__board) {
    const w = function (el) {
      h0.apply(this, arguments);
      core(() => {
        try {
          const B = board(); if (!B || !window.BoardUI) return;
          const html = window.BoardUI.home(B, opts()); if (!html) return;
          const old = el.querySelector('.bd-homecut'); if (old) old.remove();
          const at = el.querySelector('.cl-heroes');
          const box = document.createElement('div'); box.innerHTML = html;
          const cut = box.firstElementChild;
          if (at) at.after(cut); else el.prepend(cut);
          window.BoardUI.wire(cut, B, opts());
        } catch (e) { console.warn('board home', e); }
      });
    };
    Object.assign(w, h0);                  // keep clean.js's flags (__clean, __launch, __goals ...)
    w.__board = true;
    VIEWS.today = w;
  }
  window.BoardPages = { version: 1, board };
})();
