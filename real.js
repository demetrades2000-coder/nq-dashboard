// Real accounts (phone, 2026-10-28; loaded by index.html with one <script defer> AFTER board.js; read-only).
// Both MFFU accounts trade for real since 2026-10-28, so the phone shows the ACCOUNTS' own numbers first:
//   Home       "Today · real accounts" at the top (one card per real account: state, today's real trades, balance,
//              room to the floor, $ to the target, daily loss, eval day N of 10 + pass ETA, next window, health score;
//              the Strategy 3 slot, the ledger check, LIT vs ATLAS, what happened today) and the Safety card; the old
//              hero cards (paper / verdict numbers) and the "last trade" card (could be a backtest or paper trade) step aside
//   #/real     Real results: real trades only with running P&L, win rate, streaks, R distribution, $ by strategy,
//              this week's report card, incidents, live vs the backtest band, CSV export (Money tab)
// Data: the live board (data.json / home.json "board", live.json "board" when fresher: window.BoardPages.board()), its
// "real" block (engine/live_board.py). Renderer: realcore.js (window.RealUI, byte-identical to web_next/js/next/realcore.js).
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined') return;
  const board = () => (window.BoardPages && window.BoardPages.board ? window.BoardPages.board() : null);
  let loading = null;
  function core(cb) {
    if (window.RealUI) return cb();
    if (!loading) {
      loading = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'realcore.js?v=3'; s.onload = ok; s.onerror = () => { loading = null; bad(); }; document.head.appendChild(s); });
    }
    loading.then(cb).catch(() => null);
  }
  const GO = { zlarior: 'lit', botctl: 'remote' };
  const opts = () => ({ where: 'phone', go: (id) => `data-go="${GO[id] || id}"` });
  const T = (b) => (b ? +b.data_t || +b.t || 0 : 0);

  // ------------------------------------------------------------------ #/real
  let timer = null;
  function view(el) {
    el.innerHTML = head('Money · real', 'Real results', 'Only what happened on the two MFFU accounts (never the paper run), next to what the backtest expects. Read-only.')
      + '<div class="rc-host"><div class="skel" style="height:240px"></div></div>';
    const draw = () => {
      const r = el.querySelector('.rc-host'); if (!r || !window.RealUI) return;
      const B = board();
      r.innerHTML = window.RealUI.results(B, opts());
      window.RealUI.wire(r, B, opts());
    };
    core(draw);
    clearInterval(timer);
    let last = T(board());
    timer = setInterval(() => {
      if (typeof PAGE !== 'undefined' && PAGE !== 'real') { clearInterval(timer); return; }
      const t = T(board()); if (t !== last && !el.querySelector('.rc-lr.on')) { last = t; draw(); }
    }, 20000);
  }
  VIEWS.real = view;
  PAGES.real = { id: 'real', label: 'Real results', icon: 'results', desc: 'Real money only: both MFFU accounts, running P&L, win rate, streaks, vs the backtest band, CSV', group: 'money' };
  const Mo = typeof GROUPS !== 'undefined' ? GROUPS.find((g) => g.id === 'money') : null;
  if (Mo && !Mo.pages.some((p) => p[0] === 'real')) Mo.pages.splice(1, 0, ['real', 'Real results', 'results', PAGES.real.desc]);
  if (typeof SCENE !== 'undefined') SCENE.real = 'results';
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { realresults: 'real', live_results: 'real', pnl: 'real', results_real: 'real' });

  // ------------------------------------------------------------------ Home: the real accounts first
  const h0 = VIEWS.today;
  if (h0 && !h0.__real) {
    const w = function (el) {
      h0.apply(this, arguments);
      core(() => {
        try {
          const B = board(); if (!B || !window.RealUI) return;
          el.querySelectorAll('.rc-homebox, :scope > .rc-wrap.rc-moved').forEach((x) => x.remove());   // the safety card moved out of the box last time (it piled up on every redraw)
          const box = document.createElement('div'); box.className = 'rc-homebox';
          box.innerHTML = window.RealUI.today(B, opts()) + window.RealUI.safety(B, opts());
          const heroes = el.querySelector('.cl-heroes');
          if (heroes) heroes.hidden = true;
          el.prepend(box);                                                       // the real accounts come first
          const tr = el.querySelector('.cl-trade'); if (tr) tr.hidden = true;   // "last trade" could be a paper / backtest one
          // the safety card sits after the live board's "Right now" cut when it is there
          const safe = box.lastElementChild, cut = el.querySelector('.bd-homecut');
          if (safe && cut) { safe.classList.add('rc-moved'); cut.after(safe); }
          window.RealUI.wire(box, B, opts());
        } catch (e) { console.warn('real home', e); }
      });
    };
    Object.assign(w, h0);
    w.__real = true;
    VIEWS.today = w;
  }
  window.RealPages = { version: 1, core, board, opts };
})();
