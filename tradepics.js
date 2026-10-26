// Trade pictures (owner 2026-10-23: "In ATLAS's brain I want to see pictures of the trades it takes ... clear, very clear
// high-quality images with markups on it"): the one picture component shared by the phone app (tools/web_public/tradepics.js)
// and the PC dashboard (web_next/js/next/tradepics.js, a byte-identical copy: tests/test_trade_chart.py checks it).
// Classic script: window.TradePics. The PNGs come from engine/trade_chart.py (cloud: data.json "charts" + site/charts/,
// PC: GET /api/next/charts + /api/next/chart/<id>); per strategy "items" (its own paper / live trades, newest first) and
// "examples" (backtest trades) when it has none yet. Read-only.
//   TradePics.list(charts, key)          -> the pictures of one strategy (items, else examples)
//   TradePics.latest(charts, key, opts)  -> HTML: the newest picture, big, + a small strip of the next ones
//   TradePics.strip(list, opts)          -> HTML: a horizontal strip of thumbnails (lazy, skeleton while loading)
//   TradePics.open(group, i)             -> the full-screen viewer (pinch / double-tap zoom, drag to pan, swipe or arrows
//                                           between trades, Esc / x to close)
(function () {
  'use strict';
  if (window.TradePics) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (v) => (v == null || isNaN(v)) ? '' : (v > 0 ? '+' : v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
  const fR = (v) => (v == null || isNaN(v)) ? '' : (v > 0 ? '+' : '') + Number(v).toFixed(2) + 'R';
  const hm = (t) => t ? new Date(t * 1000).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const KIND = { TARGET: 'target', STOP: 'stop', BE: 'breakeven', EOD: 'flat 15:55', FLAT: 'flat', CUT_T15: '15-min cut', CUT: '15-min cut', OPEN: 'open' };
  const G = {};
  let gid = 0;
  // its own trades first (newest first), then the backtest examples (swipe on from the last trade into them)
  function list(charts, key) {
    const s = charts && charts.strategies ? charts.strategies[key] : null;
    if (!s) return [];
    return (s.items || []).concat(s.examples || []).filter((x) => x && x.url);
  }
  function all(charts, keys) {
    const out = [];
    for (const k of keys || Object.keys((charts && charts.strategies) || {})) for (const x of ((charts.strategies[k] || {}).items || [])) if (x && x.url) out.push(x);
    return out.sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0));
  }
  function examples(charts, keys) {
    const out = [];
    for (const k of keys || Object.keys((charts && charts.strategies) || {})) for (const x of ((charts.strategies[k] || {}).examples || []).slice(0, 4)) if (x && x.url) out.push(x);
    return out.sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0));
  }
  function title(x) {
    const res = x.exit_kind === 'OPEN' || x.open ? 'open' : `${KIND[x.exit_kind] || String(x.exit_kind || '').toLowerCase()} ${usd(x.usd)} ${fR(x.r)}`;
    return `${x.short || x.key || ''} · ${hm(x.entry_t)} ET · ${x.side || ''} · ${res}`.trim();
  }
  const col = (x) => x.open || x.exit_kind === 'OPEN' ? 'var(--accent,#6d7cff)' : (x.r || 0) > 0.05 ? 'var(--good,#2ee59d)' : (x.r || 0) < -0.05 ? 'var(--bad,#ff5a7a)' : 'var(--muted,#8a93a6)';
  function reg(L) { const g = 'tp' + (++gid); G[g] = L; return g; }
  function img(x, cls) {
    return `<span class="tp-sk ${cls || ''}"><img class="tp-img" src="${esc(x.url)}" alt="${esc(x.alt || title(x))}" loading="lazy" decoding="async" width="${x.w || 1600}" height="${x.h || 900}"></span>`;
  }
  function strip(L, opts) {
    opts = opts || {};
    if (!L || !L.length) return opts.empty ? `<p class="tp-none">${esc(opts.empty)}</p>` : '';
    const g = opts.group || reg(L), o = opts.offset || 0;
    return `<div class="tp-strip" role="list" aria-label="${esc(opts.label || 'Trade pictures')}">${L.map((x, i) => `<button type="button" class="tp-th" role="listitem" data-tp="${g}" data-tp-i="${i + o}" style="--c:${col(x)}" title="${esc(title(x))}">
      ${img(x, 'tp-small')}<span class="tp-cap"><b>${esc(x.short || x.key || '')}</b> ${esc(hm(x.entry_t))} · ${esc(x.side || '')}<em style="color:${col(x)}">${esc(x.open ? 'open' : (KIND[x.exit_kind] || '') + ' ' + fR(x.r))}</em>${x.example ? '<i>backtest</i>' : ''}</span></button>`).join('')}</div>`;
  }
  function latest(charts, key, opts) {
    opts = opts || {};
    const L = list(charts, key);
    if (!L.length) return opts.empty ? `<p class="tp-none">${esc(opts.empty)}</p>` : '';
    const g = reg(L), x = L[0];
    const more = L.length > 1 ? strip(L.slice(1, 7), { label: 'Earlier trades', group: g, offset: 1 }) : '';
    return `<div class="tp-card"><div class="tp-h"><b>${esc(opts.title || (x.example ? 'Backtest example (no paper trade yet)' : 'Latest trade'))}</b><span>${esc(title(x))}</span></div>
      <button type="button" class="tp-big" data-tp="${g}" data-tp-i="0" aria-label="Open the picture full screen">${img(x, '')}</button>
      <p class="tp-alt">${esc(x.alt || '')}</p>${more}</div>`;
  }
  // ---------------------------------------------------------------- viewer
  let V = null;
  function open(g, i) {
    const L = G[g]; if (!L || !L.length) return;
    css();
    if (!V) {
      const el = document.createElement('div');
      el.className = 'tp-lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Trade picture');
      el.innerHTML = `<div class="tp-lb-top"><span class="tp-lb-t"></span><span class="tp-lb-n"></span><button type="button" class="tp-lb-x" aria-label="Close">×</button></div>
        <div class="tp-lb-stage"><img class="tp-lb-img" alt=""><span class="tp-lb-spin"></span></div>
        <button type="button" class="tp-lb-p" aria-label="Previous trade">‹</button><button type="button" class="tp-lb-q" aria-label="Next trade">›</button>
        <p class="tp-lb-alt"></p>`;
      document.body.appendChild(el);
      V = { el, img: el.querySelector('.tp-lb-img'), stage: el.querySelector('.tp-lb-stage'), s: 1, x: 0, y: 0, P: new Map(), L: null, i: 0 };
      el.querySelector('.tp-lb-x').onclick = close;
      el.querySelector('.tp-lb-p').onclick = () => go(-1);
      el.querySelector('.tp-lb-q').onclick = () => go(1);
      V.img.addEventListener('load', () => el.classList.add('ok'));
      wire(V);
    }
    V.L = L; V.i = Math.max(0, Math.min(L.length - 1, +i || 0));
    show();
    V.el.classList.add('on');
    document.documentElement.classList.add('tp-noscroll');
  }
  function show() {
    const x = V.L[V.i];
    V.el.classList.remove('ok');
    V.s = 1; V.x = 0; V.y = 0; apply();
    V.img.src = x.url; V.img.alt = x.alt || title(x);
    if (V.img.complete && V.img.naturalWidth) V.el.classList.add('ok');
    V.el.querySelector('.tp-lb-t').textContent = title(x) + (x.example ? ' · backtest example' : '');
    V.el.querySelector('.tp-lb-n').textContent = V.L.length > 1 ? `${V.i + 1} / ${V.L.length}` : '';
    V.el.querySelector('.tp-lb-alt').textContent = x.alt || '';
    V.el.querySelector('.tp-lb-p').hidden = V.i <= 0;
    V.el.querySelector('.tp-lb-q').hidden = V.i >= V.L.length - 1;
  }
  function go(k) { if (!V || !V.L) return; const j = V.i + k; if (j < 0 || j >= V.L.length) return; V.i = j; show(); }
  function close() { if (!V) return; V.el.classList.remove('on'); document.documentElement.classList.remove('tp-noscroll'); V.P.clear(); }
  function apply() { V.img.style.transform = `translate(${V.x}px,${V.y}px) scale(${V.s})`; V.el.classList.toggle('zoom', V.s > 1.01); }
  function clampPan() {
    const r = V.stage.getBoundingClientRect(), w = r.width * (V.s - 1) / 2, h = r.height * (V.s - 1) / 2;
    V.x = Math.max(-w, Math.min(w, V.x)); V.y = Math.max(-h, Math.min(h, V.y));
  }
  function zoomAt(s, cx, cy) {
    const r = V.stage.getBoundingClientRect(), ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
    const k = s / V.s;
    V.x = ox - (ox - V.x) * k; V.y = oy - (oy - V.y) * k; V.s = s;
    if (V.s <= 1.01) { V.s = 1; V.x = 0; V.y = 0; }
    clampPan(); apply();
  }
  function wire(V) {
    const st = V.stage;
    let start = null, pinch = null, lastTap = 0, moved = false;
    st.addEventListener('pointerdown', (e) => {
      try { st.setPointerCapture(e.pointerId); } catch (err) { /* synthetic / already released pointer */ }
      V.P.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      if (V.P.size === 2) {
        const [a, b] = [...V.P.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: V.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        start = null;
      } else if (V.P.size === 1) start = { x: e.clientX, y: e.clientY, px: V.x, py: V.y, t: Date.now() };
    });
    st.addEventListener('pointermove', (e) => {
      if (!V.P.has(e.pointerId)) return;
      V.P.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && V.P.size >= 2) {
        const [a, b] = [...V.P.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoomAt(Math.max(1, Math.min(5, pinch.s * d / pinch.d)), pinch.cx, pinch.cy);
        moved = true;
      } else if (start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (V.s > 1.01) { V.x = start.px + dx; V.y = start.py + dy; clampPan(); apply(); }
      }
    });
    const up = (e) => {
      if (!V.P.has(e.pointerId)) return;
      V.P.delete(e.pointerId);
      if (V.P.size < 2) pinch = null;
      if (start && V.P.size === 0) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y, dt = Date.now() - start.t;
        if (V.s <= 1.01 && Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy) && dt < 700) go(dx < 0 ? 1 : -1);   // swipe
        else if (!moved && dt < 300) {
          const now = Date.now();
          if (now - lastTap < 320) { zoomAt(V.s > 1.01 ? 1 : 2.5, e.clientX, e.clientY); lastTap = 0; }      // double tap
          else lastTap = now;
        }
        start = null;
      }
    };
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);
    st.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.max(1, Math.min(5, V.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18))), e.clientX, e.clientY); }, { passive: false });
    V.el.addEventListener('click', (e) => { if (e.target === V.el) close(); });
  }
  document.addEventListener('keydown', (e) => {
    if (!V || !V.el.classList.contains('on')) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-tp]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    open(b.dataset.tp, +b.dataset.tpI || 0);
  }, true);
  // skeleton off once the image is in (load does not bubble: listen in the capture phase); a broken image shows its alt text
  document.addEventListener('load', (e) => { const t = e.target; if (t && t.classList && t.classList.contains('tp-img')) t.parentNode.classList.add('ok'); }, true);
  document.addEventListener('error', (e) => { const t = e.target; if (t && t.classList && t.classList.contains('tp-img')) t.parentNode.classList.add('bad'); }, true);
  function settle(root) {
    (root || document).querySelectorAll('img.tp-img').forEach((im) => { if (im.complete && im.naturalWidth) im.parentNode.classList.add('ok'); });
  }
  const CSS = `.tp-card{border:1px solid var(--line,rgba(140,150,170,.25));border-radius:12px;padding:10px;margin:10px 0;background:color-mix(in srgb,var(--line,#8c96aa) 10%,transparent)}
.tp-h{display:flex;flex-direction:column;gap:2px;margin:0 0 8px}.tp-h b{font-size:13px}.tp-h span{font-size:12px;opacity:.75}
.tp-big{display:block;width:100%;max-width:980px;padding:0;border:0;background:none;cursor:zoom-in;border-radius:10px;overflow:hidden}
.tp-sk{position:relative;display:block;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:linear-gradient(100deg,#0d1016 30%,#1a1f2b 50%,#0d1016 70%);background-size:300% 100%;animation:tp-sh 1.3s linear infinite}
.tp-sk.ok,.tp-sk.bad{animation:none;background:#07080c}.tp-sk img{display:block;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .25s}.tp-sk.ok img{opacity:1}
.tp-sk.bad img{opacity:1;object-fit:none;font-size:12px;color:#a9b1c3}
@keyframes tp-sh{0%{background-position:100% 0}100%{background-position:-100% 0}}
.tp-alt{margin:8px 2px 2px;font-size:12px;line-height:1.45;opacity:.78;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.tp-none{font-size:12.5px;opacity:.7;margin:6px 0}
.tp-strip{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 2px 8px;-webkit-overflow-scrolling:touch}
.tp-th{flex:0 0 auto;width:min(62vw,230px);scroll-snap-align:start;display:flex;flex-direction:column;gap:5px;text-align:left;font:inherit;color:inherit;cursor:zoom-in;
border:1px solid color-mix(in srgb,var(--c) 45%,transparent);border-radius:11px;padding:5px;background:color-mix(in srgb,var(--c) 7%,transparent)}
.tp-th .tp-sk{border-radius:7px}.tp-cap{font-size:11.5px;line-height:1.35;display:block}.tp-cap em{display:block;font-style:normal;font-weight:700}.tp-cap i{font-style:normal;font-size:10.5px;opacity:.65;margin-left:4px}
.tp-lb{position:fixed;inset:0;z-index:2147483000;background:#05060a;display:none;flex-direction:column;touch-action:none;color:#eef1f8}
.tp-lb.on{display:flex}.tp-noscroll,.tp-noscroll body{overflow:hidden}
.tp-lb-top{display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top,0px)) 12px 6px;font-size:13px}.tp-lb-t{flex:1;min-width:0;font-weight:650;line-height:1.35}
.tp-lb-n{opacity:.7;font-size:12px}.tp-lb-x{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;font-size:24px;line-height:1;cursor:pointer}
.tp-lb-stage{position:relative;flex:1;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:zoom-in}
.tp-lb.zoom .tp-lb-stage{cursor:grab}.tp-lb-img{max-width:100%;max-height:100%;transform-origin:center;user-select:none;-webkit-user-drag:none;transition:opacity .2s;opacity:0}
.tp-lb.ok .tp-lb-img{opacity:1}.tp-lb-spin{position:absolute;width:30px;height:30px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:#6d7cff;animation:tp-rot 0.9s linear infinite}
.tp-lb.ok .tp-lb-spin{display:none}@keyframes tp-rot{to{transform:rotate(360deg)}}
.tp-lb-p,.tp-lb-q{position:absolute;top:50%;width:44px;height:64px;margin-top:-32px;border:0;border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-size:34px;cursor:pointer}
.tp-lb-p{left:8px}.tp-lb-q{right:8px}.tp-lb-p[hidden],.tp-lb-q[hidden]{display:none}
.tp-lb-alt{margin:0;padding:8px 14px calc(12px + env(safe-area-inset-bottom,0px));font-size:12.5px;line-height:1.45;opacity:.8;max-height:22vh;overflow:auto}
@media (hover:none){.tp-lb-p,.tp-lb-q{display:none}}`;
  function css() { if (!document.getElementById('tp-css')) { const s = document.createElement('style'); s.id = 'tp-css'; s.textContent = CSS; document.head.appendChild(s); } }
  css();
  window.TradePics = { list, all, examples, latest, strip, open, close, settle, css, title, version: 1 };
})();
