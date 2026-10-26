// Money > Scaling plan (phone; loaded by index.html with one <script defer> after scalecore.js; read-only):
//   "you are at step N; next step: <action> when <trigger>; progress X%", the ladder 2 -> 4 -> 6 -> 8 -> 10 accounts (LIT +
//   ATLAS) with $ a month on 2026-like and 2025-like trades, fees, risk at once, eval $ and months to get there.
//   Data: data.json "scale" (engine/scale_plan.cloud_view, built by tools/build_web_dashboard.py from business.json + the
//   PC's heartbeat). Renderer: scalecore.js (shared with the PC dashboard).
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, head, emptyBox) when they exist.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  function view(el) {
    const S = (typeof D !== 'undefined' && D && D.scale) || null;
    const sub = (S && S.sentence) || 'Where you are on the ladder and what the next account needs';
    el.innerHTML = (typeof head === 'function' ? head('Money · scaling plan', 'Scaling plan', sub) : '<h2>Scaling plan</h2>') + '<div id="scRoot"></div>';
    const root = el.querySelector('#scRoot');
    if (!window.ScaleUI) { root.innerHTML = '<div class="card">scalecore.js did not load.</div>'; return; }
    if (!S) { root.innerHTML = typeof emptyBox === 'function' ? emptyBox('No scaling plan in this build.', 'The next cloud run adds it.') : '<div class="card">No scaling plan in this build.</div>'; return; }
    window.ScaleUI.render(root, S);
  }
  function install() {
    const G = GROUPS.find((g) => g.id === 'money') || GROUPS.find((g) => g.id === 'system') || GROUPS[GROUPS.length - 1];
    if (!G) return;
    if (!G.pages.some((p) => p[0] === 'scale')) G.pages.splice(Math.min(2, G.pages.length), 0, ['scale', 'Scaling plan', 'prop', 'Step N of the ladder, the next account and when']);
    PAGES.scale = { id: 'scale', label: 'Scaling plan', icon: 'prop', desc: 'Where you are on the ladder, the next step', group: G.id };
    VIEWS.scale = view;
    if (typeof SCENE !== 'undefined') SCENE.scale = 'eval';
    if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { scaling: 'scale', ladder: 'scale', scaleplan: 'scale', grow: 'scale' });
    if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(scale|scaling|ladder|scaleplan|grow)\b/.test(location.hash)) route(); }
  }
  install();
})();
