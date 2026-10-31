// Learning pages (phone, 2026-10-25; loaded by index.html with one <script defer> before clean.js; read-only).
//   #/learning   Zlarior > Results > Learning: live vs backtest gap, real-fill slippage / latency / commission, weekly
//                reviews, "The bot suggests" cards, every trade's review against its backtest twin
//   #/atlearn    ATLAS > Results > Learning: the same for ATLAS (members) and ATLAS v2 (paper shadow)
// Data: data.json "learning_live" (engine/live_learning.site_block). Renderer: learncore.js (window.LearnUI, byte-identical
// to web_next/js/next/learncore.js). Nothing here changes a setting: a suggestion shows the command that would approve it.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined') return;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  function view(el, bots, title, eyebrow) {
    const B = (HD() || {}).learning_live;
    el.innerHTML = head(eyebrow, title, 'What the bot learned from real trading, the way a disciplined trader reviews his week. Read-only.')
      + '<div id="llRoot"></div>';
    const draw = () => { const r = el.querySelector('#llRoot'); if (r && window.LearnUI) r.innerHTML = window.LearnUI.page(B, bots, { foot: 'engine/live_learning.py · research/writeups/live-learning.md' }); };
    if (window.LearnUI) return draw();
    const s = document.createElement('script'); s.src = 'learncore.js?v=1'; s.onload = draw;
    s.onerror = () => { const r = el.querySelector('#llRoot'); if (r) r.innerHTML = emptyBox('Could not load the learning card.', ''); };
    document.head.appendChild(s);
  }
  VIEWS.learning = (el) => view(el, ['lit'], 'Zlarior is learning', 'Zlarior · results');
  VIEWS.atlearn = (el) => view(el, ['atlas', 'atlas_v2'], 'ATLAS is learning', 'ATLAS · results');
  PAGES.learning = { id: 'learning', label: 'Learning', icon: 'brain', desc: 'Live vs backtest, real fills, weekly reviews, suggestions', group: 'system' };
  PAGES.atlearn = { id: 'atlearn', label: 'Learning', icon: 'brain', desc: 'ATLAS live vs backtest, weekly reviews, suggestions', group: 'system' };
  if (typeof SCENE !== 'undefined') { SCENE.learning = 'engine'; SCENE.atlearn = 'engine'; }
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { suggestions: 'learning', suggest: 'learning' });
  window.LearningPages = { version: 1 };
})();
