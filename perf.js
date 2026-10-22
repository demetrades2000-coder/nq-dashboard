// Money > Performance (phone; loaded by index.html with one <script defer> after perfcore.js; read-only):
//   is live inside the backtest's expected range, live vs backtest on the same days, exit efficiency, robustness + the
//   look-ahead audit, the monthly out-of-sample scoreboard and the status page, from data.json "perf" (engine/perf.py,
//   built by tools/build_web_dashboard.py). The renderer is perfcore.js (shared with the PC dashboard).
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, head, emptyBox) when they exist.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  let TAB = 'range';
  try { TAB = localStorage.getItem('le-perf-tab') || 'range'; } catch (e) { /* private mode */ }
  function view(el) {
    const P = (typeof D !== 'undefined' && D && D.perf) || null;
    const R = P && P.range;
    const sub = (R && R.headline) || 'Is live inside the expected range, live vs backtest, exit efficiency, robustness, months, status';
    el.innerHTML = (typeof head === 'function' ? head('Money · performance', 'Performance', sub) : '<h2>Performance</h2>') + '<div id="pfRoot"></div>';
    const root = el.querySelector('#pfRoot');
    if (!window.PerfUI) { root.innerHTML = '<div class="card">perfcore.js did not load.</div>'; return; }
    if (!P) { root.innerHTML = typeof emptyBox === 'function' ? emptyBox('No performance data in this build.', 'The next cloud run adds it.') : '<div class="card">No performance data in this build.</div>'; return; }
    window.PerfUI.render(root, P, { tab: TAB, onTab: (t) => { TAB = t; try { localStorage.setItem('le-perf-tab', t); } catch (e) { /* ignore */ } } });
  }
  function install() {
    const G = GROUPS.find((g) => g.id === 'money') || GROUPS.find((g) => g.id === 'system') || GROUPS[GROUPS.length - 1];
    if (!G) return;
    if (!G.pages.some((p) => p[0] === 'perf')) G.pages.splice(1, 0, ['perf', 'Performance', 'results', 'Inside the expected range? Live vs backtest, exits, robustness, months, status']);
    PAGES.perf = { id: 'perf', label: 'Performance', icon: 'results', desc: 'Expected range, live vs backtest, robustness, status', group: G.id };
    VIEWS.perf = view;
    if (typeof SCENE !== 'undefined') SCENE.perf = 'eval';
    if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { performance: 'perf', range: 'perf', robustness: 'perf', uptime: 'perf', status: 'perf', incidents: 'perf', walkforward: 'perf' });
    if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(perf|performance|range|robustness|uptime|status|incidents|walkforward)\b/.test(location.hash)) route(); }
  }
  install();
})();
