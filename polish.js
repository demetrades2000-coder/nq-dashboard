// Calm, premium phone app (2026-10-30 night, owner: "more very useful features ... then clean it up, organized, clean ...
// then the UI, quality, the effects ... I wanna be shocked"; read-only UI, links only). Loaded LAST (after blitz.js).
//   Home     one status bar ("is everything OK right now?"), the three accounts (eval ring, $ to the target, room, today's
//            real $, a sparkline, the day in one line), what matters now, the Sunday open card (weekends), four quick
//            tiles; every older Home card is still there under "Everything else on Home" (one tap, remembered)
//   bot tabs Zlarior · ATLAS · BLITZ open on the same account card, in the bot's own colour (blue / orange / purple)
//   palette  search every page, section and number from the header (or "/" and Ctrl/Cmd+K on a keyboard)
//   motion   page transitions, card entrances, count-ups, press states; reduced motion = none
//   sky      the static sky drifts a little with scroll and tilt (the 3D scene gets the same via FX.parallax)
// Classic script on the main page's helpers (VIEWS, PAGES, GROUPS, PAGE, ARG, render, store, icon, esc). Never arms,
// routes or changes the bot.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined' || !window.StatusUI) return;
  const SU = window.StatusUI, PD = window.PhoneData || {}, BU = window.BlitzUI;
  window.POLISH = { version: 1 };
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const nowS = () => Date.now() / 1000;
  const okN = (v) => typeof v === 'number' && Number.isFinite(v);
  const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || store.get('motion', true) === false; } catch (e) { return false; } };
  const BOTG = { lit: 'lit', atlas: 'atlas', blitz: 'blitz' };
  // full-screen app pages (their own canvas, camera and fixed labels): no card entrance on their root
  const NO_ENTER = new Set(['today', 'holo', 'liveview']);
  SU.css();

  // ------------------------------------------------------------------ the data (the same picks as board.js / mission.js / blitz.js)
  function board() {
    if (PD.board) { try { return PD.board(); } catch (e) { /* fall through */ } }
    const h = HD() || {}; return h.board && !h.board.error ? h.board : null;
  }
  // the critical alert to acknowledge (alerts.js draws it as #apBan on top of each page; a page that redraws itself can
  // wipe it for a moment, so the last one seen counts for 3 more minutes)
  let BAN = null;
  function alerts() {
    const b = document.getElementById('apBan'), now = nowS();
    const t = b ? ((b.querySelector('.ap-ban b') || b.querySelector('b') || b).textContent || '').trim() : '';
    if (t && b.querySelector('.ap-ban')) {
      const m = String(b.querySelector('a.ap-ban')?.getAttribute('href') || '').match(/^#\/ack(?:\/(.+))?$/);
      BAN = { lvl: 'bad', text: t.replace(/\s*·\s*tap Got it\s*$/i, ''), t: now, go: 'ack', arg: m && m[1] ? decodeURIComponent(m[1]) : '' };
    }
    else if (b && !b.querySelector('.ap-ban')) BAN = null;          // the banner is there without a critical alert (a cloud-stale note)
    return BAN && now - BAN.t < 180 ? [{ lvl: BAN.lvl, text: BAN.text, go: BAN.go, arg: BAN.arg }] : [];
  }
  function model() {
    const h = HD() || {};
    let bl = null;
    try { if (BU && PD.bModel) bl = BU.line(PD.bModel()); } catch (e) { bl = null; }
    let news = [];
    try { news = PD.news ? PD.news() : []; } catch (e) { news = []; }
    return { now: nowS(), where: 'phone', board: board(), lv: (window.LVP && window.LVP.d) || null, news, cloud: h.live && h.live.last_run ? { t: +h.live.last_run } : null,
      cal: (h.goals || {}).calendar || null, blitz: bl, alerts: alerts() };
  }
  window.POLISH.model = model;

  // ------------------------------------------------------------------ Home
  const ic = (n) => (typeof icon === 'function' ? icon(n) : '');
  function nowCard(M) {
    const MU = window.MissionUI, rows = [];
    let As = [];
    try { As = MU ? MU.accounts(M).filter((a) => a && !a.placeholder) : []; } catch (e) { As = []; }
    const money = (v) => (okN(v) ? (v < 0 ? '−' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US') : '—');
    const smoney = (v) => (okN(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v)).replace('−', '') : '—');
    const tm = (t) => { try { return new Date(t * 1000).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' ET'; } catch (e) { return ''; } };
    for (const A of As) {
      if (!A.pos) continue;
      rows.push(`<a class="pl-now-r" data-go="${A.key === 'lit' ? 'lit' : A.key}" style="--c:${SU.COLOR[A.key] || '#8aa0ff'}"><i class="pl-now-i live">${ic(A.pos.dir === 1 ? 'long' : 'short')}</i>
        <span><b>${esc(A.name)} is in a ${esc(A.pos.side)} · ${A.pos.qty || ''} MNQ</b><em>at ${A.pos.entry != null ? A.pos.entry.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'} · stop ${okN(A.pos.atStop) ? money(A.pos.atStop) : '—'} · target ${okN(A.pos.atTgt) ? '+' + money(A.pos.atTgt) : '—'}</em></span>
        <strong class="${okN(A.pos.unreal) ? (A.pos.unreal >= 0 ? 'up' : 'dn') : ''}">${okN(A.pos.unreal) ? smoney(A.pos.unreal) : ''}</strong></a>`);
    }
    // since you last looked (the deck's digest: closed / opened trades, alerts, reviews, ideas) when something changed
    try {
      const DU = window.DeckUI;
      if (DU && DU.digestData && PD.dModel) {
        const G = DU.digestData(PD.dModel());
        if (G && !G.first && G.n) {
          const ago = ((s) => (s < 5400 ? Math.round(s / 60) + ' min' : Math.round(s / 3600) + ' h'))(M.now - G.last);
          const parts = [G.newT.length ? `${G.newT.length} closed trade${G.newT.length === 1 ? '' : 's'}${G.usdNew ? ` (${smoney(G.usdNew)} real)` : ''}` : '',
            G.opened.filter((t) => t.open).length ? `${G.opened.filter((t) => t.open).length} opened` : '', G.al.length ? `${G.al.length} alert${G.al.length === 1 ? '' : 's'}` : '',
            G.rv.length ? `${G.rv.length} review${G.rv.length === 1 ? '' : 's'}` : '', G.pr.length ? `${G.pr.length} idea${G.pr.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
          rows.splice(As.filter((a) => a.pos).length, 0, `<a class="pl-now-r" data-go="deck"><i class="pl-now-i new">${ic('alerts')}</i><span><b>Since you last looked · ${esc(ago)} ago</b><em>${esc(parts || 'something changed')}</em></span><strong class="pl-badge">${G.n}</strong></a>`);
        }
      }
    } catch (e) { /* the digest is optional */ }
    // the next window (or the open one)
    const S = SU.summary(M), nx = S.next;
    if (nx && nx.t) rows.push(`<a class="pl-now-r" data-go="deck"><i class="pl-now-i">${ic('clock')}</i><span><b>${esc(nx.label)} · ${esc(nx.detail.split(':')[0])}</b><em>${esc(nx.detail.replace(/^[^:]*:\s*/, ''))}</em></span><strong><span class="su-cd" data-su-cd="${Math.round(nx.t)}"></span></strong></a>`);
    // the next high-impact news in 24 h
    const nw = (M.news || []).filter((n) => okN(n.t) && n.t > M.now - 600 && n.t < M.now + 86400 && /high|fomc/i.test(n.impact || 'high')).sort((a, b) => a.t - b.t)[0];
    rows.push(nw ? `<a class="pl-now-r" data-go="news"><i class="pl-now-i warn">${ic('news')}</i><span><b>${esc(nw.title)}</b><em>${esc(tm(nw.t))} · high-impact news</em></span><strong><span class="su-cd" data-su-cd="${Math.round(nw.t)}"></span></strong></a>`
      : `<a class="pl-now-r" data-go="news"><i class="pl-now-i">${ic('news')}</i><span><b>No big US news in the next 24 h</b><em>The calendar the bots read</em></span></a>`);
    // the last real trade (NinjaTrader fills only)
    const B = M.board || {}, lt = (B.trades || []).filter((t) => t && t.src === 'live' && t.open === false).sort((a, b) => (+b.exit_t || 0) - (+a.exit_t || 0))[0];
    if (lt) {
      const nm = (SU.NAME[lt.acct] || lt.acct || '');
      rows.push(`<a class="pl-now-r" data-go="real" style="--c:${SU.COLOR[lt.acct] || '#8aa0ff'}"><i class="pl-now-i">${ic(lt.side === 'LONG' ? 'long' : 'short')}</i><span><b>Last real trade · ${esc(nm)}</b><em>${esc(tm(+lt.exit_t || +lt.entry_t))} · ${esc(lt.side)} ${lt.qty || ''} MNQ · ${esc(lt.exit || '')}${okN(+lt.r) ? ' · ' + (+lt.r > 0 ? '+' : '') + (+lt.r).toFixed(2) + 'R' : ''}</em></span><strong class="${+lt.usd > 0 ? 'up' : +lt.usd < 0 ? 'dn' : ''}">${smoney(+lt.usd)}</strong></a>`);
    } else rows.push(`<a class="pl-now-r" data-go="real"><i class="pl-now-i">${ic('results')}</i><span><b>No real trade yet</b><em>The first NinjaTrader fill shows here within a minute</em></span></a>`);
    return `<section class="pl-now" aria-label="What matters now"><h3 class="pl-h3">What matters now</h3>${rows.join('')}</section>`;
  }
  // the greeting: the time of day and the date in ET (the bots' clock), one calm line above the status bar
  function hello() {
    try {
      const d = new Date(), o = { timeZone: 'America/New_York' };
      const h = +d.toLocaleString('en-US', { ...o, hour: '2-digit', hour12: false }) % 24;
      const hi = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      const day = d.toLocaleDateString('en-US', { ...o, weekday: 'long', month: 'short', day: 'numeric' });
      const hm = d.toLocaleTimeString('en-US', { ...o, hour: '2-digit', minute: '2-digit', hour12: false });
      return `<div class="pl-hi"><b>${hi}</b><span>${esc(day)} · <span data-pl-clock>${esc(hm)}</span> ET</span></div>`;
    } catch (e) { return ''; }
  }
  function quick() {
    const T = [['liveview', 'Live View', 'chart', 'live chart'], ['holo', 'Holodeck', 'layers', 'fills in 3D'], ['mission', 'Mission', 'radar', 'control'], ['mind', 'Mind', 'brain', 'game plans']];
    return `<nav class="pl-quick" aria-label="Quick">${T.filter(([id]) => PAGES[id]).map(([id, l, i, s]) => `<a data-go="${id}"><i>${ic(i)}</i><b>${l}</b><em>${s}</em></a>`).join('')}</nav>`;
  }
  const FOLD_NAMES = [['.mc-strip', 'Mission Control'], ['.rc-homebox', 'real accounts in full'], ['.rc-wrap', 'safety'], ['.bd-homecut', 'right now per bot'], ['.cl-launch', 'launch checklist'],
    ['.bz-home', 'trader\'s deck + Mind'], ['.cl-plan', 'today\'s plan'], ['.cl-list', 'one tap away']];
  function paintHome(el, first) {
    el.querySelectorAll(':scope > .pl-home, :scope > .pl-fold').forEach((x) => x.remove());
    const M = model();
    const box = document.createElement('div'); box.className = 'pl-home';
    const more = `<a class="pl-btn" data-go="mission">Mission Control</a><a class="pl-btn" data-go="board">Live board</a><a class="pl-btn" data-go="launch">Launch checklist</a>`;
    // the weekend (CME closed): the Sunday open card comes right under the status bar; on a trading day it sits lower
    const sun = SU.sunday(M), closed = !SU.marketOpen(M.now);
    box.innerHTML = hello() + SU.bar(M, { open: SU.isOpen(), more, where: 'phone' }) + (closed ? sun : '') + SU.accounts(M, { where: 'phone' }) + nowCard(M)
      + (SU.market ? SU.market(M) : '') + SU.week(M) + (closed ? '' : sun) + quick();
    el.prepend(box);
    // no live board yet (the PC never reported, an older data.json): the account cards come from clean.js's hero cards
    // (eval tracker + goals + ATLAS card), placed where the board's cards would be; BLITZ keeps its paper card
    const have = new Set([...box.querySelectorAll('.su-acct')].map((a) => a.dataset.bot));
    const heroes = el.querySelector(':scope > .cl-heroes');
    if (heroes && !(have.has('lit') && have.has('atlas'))) {
      heroes.hidden = false; heroes.classList.add('pl-fallback');
      const at = box.querySelector('.su-accts'); if (at) at.before(heroes); else box.querySelector('.su-bar')?.after(heroes);
    }
    const all = !!store.get('pl.homeAll', false);
    el.classList.add('pl-h'); el.classList.toggle('pl-all', all);
    const fold = document.createElement('button'); fold.type = 'button'; fold.className = 'pl-fold'; fold.setAttribute('aria-expanded', String(all));
    const names = FOLD_NAMES.filter(([s]) => el.querySelector(':scope > ' + s)).map((x) => x[1]);
    fold.innerHTML = `<span><b>${all ? 'Hide' : 'Everything else on Home'}</b><em>${esc(names.length ? names.join(' · ') : 'Mission Control, the real accounts in full, safety, the deck, the Mind')}</em></span><i class="pl-chev"></i>`;
    fold.onclick = () => { const on = !el.classList.contains('pl-all'); el.classList.toggle('pl-all', on); store.set('pl.homeAll', on); fold.setAttribute('aria-expanded', String(on)); fold.querySelector('b').textContent = on ? 'Hide' : 'Everything else on Home'; if (on) enter(el, ':scope > .pl-fold ~ *'); };
    box.after(fold);
    SU.wire(el); SU.tick(box);
    if (first) { box.classList.add('pl-first'); countUp(box); enter(box, ':scope > *'); }   // rings / sparklines draw in once, not on every live redraw
  }
  const h0 = VIEWS.today;
  if (h0 && !h0.__pl) {
    const w = function (el) {
      const first = !el.querySelector(':scope > .pl-home');
      h0.apply(this, arguments);
      try { paintHome(el, first); } catch (e) { console.warn('polish home', e); }
    };
    Object.keys(h0).forEach((k) => { w[k] = h0[k]; });
    w.__pl = true;
    VIEWS.today = w;
  }

  // ------------------------------------------------------------------ the bot tabs: the same account card on top of Today
  function botTop(el, soft) {
    const g = typeof groupOf === 'function' ? groupOf(PAGE) : '';
    const today = (PAGE === 'lit') || ((PAGE === 'atlas' || PAGE === 'blitz') && (!ARG || ARG === 'today'));
    el.querySelectorAll(':scope > .pl-bot').forEach((x) => x.remove());
    if (!BOTG[g] || !today) return;
    const M = model(), k = g === 'lit' ? 'lit' : g;
    if (k === 'blitz') M.blitz = null;          // the BLITZ hero right below says what it is doing: the card keeps to "paper until its own 25K"
    let A = null;
    try { A = (window.MissionUI.accounts(M) || []).find((a) => a.key === k) || null; } catch (e) { A = null; }
    if (!A) return;
    const box = document.createElement('div'); box.className = 'pl-bot' + (soft ? '' : ' pl-first');
    let why = '';
    try {
      const R = !A.pos && !A.placeholder && window.MissionUI.whyNot ? window.MissionUI.whyNot(A, M).filter((r) => r && r.text && !/^[^:]{0,30}:\s*$/.test(String(r.text).trim())).slice(0, 3) : [];
      const brain = k === 'lit' ? 'data-go="brain"' : `data-go="${k}" data-arg="brain"`;
      if (R.length) why = `<div class="pl-why"><span class="pl-h3">Why no trade yet</span><ul>${R.map((r) => `<li class="${r.ok === true ? 'ok' : r.ok === false ? 'no' : 'mid'}"><i></i><span>${esc(r.text)}</span></li>`).join('')}</ul><a class="pl-why-go" ${brain}>Every rule it checks, in its Brain ›</a></div>`;
    } catch (e) { why = ''; }
    box.innerHTML = SU.acctCard(A, M, { where: 'phone', go: () => `data-go="${k === 'lit' ? 'evalhq' : k}"${k === 'lit' ? '' : ' data-arg="results"'}` }) + why;
    const after = [...el.children].filter((c) => c.classList.contains('mo-strip')).pop();
    if (after) after.after(box); else el.prepend(box);
    SU.tick(box);
  }

  // Home's status bar again once the page is drawn: the critical-alert banner (alerts.js) lands after the page itself
  function refreshBar() {
    if (typeof PAGE === 'undefined' || PAGE !== 'today') return;
    const b = document.querySelector('#page > .pl-home > .su-bar'); if (!b) return;
    const more = `<a class="pl-btn" data-go="mission">Mission Control</a><a class="pl-btn" data-go="board">Live board</a><a class="pl-btn" data-go="launch">Launch checklist</a>`;
    const h = SU.bar(model(), { open: SU.isOpen(), more, where: 'phone' });
    if (b.__h === h) return;
    const t = document.createElement('div'); t.innerHTML = h;
    const nb = t.firstElementChild; nb.__h = h; b.replaceWith(nb); SU.tick(nb);
  }
  // a bot page that draws itself again later (BLITZ once its Live View data lands, ATLAS on a poll) keeps its card on top
  function keepBotTop() {
    const el = document.getElementById('page'); if (!el || el.__plObs || typeof MutationObserver === 'undefined') return;
    let q = 0;
    el.__plObs = new MutationObserver(() => {
      if (q) return;
      q = requestAnimationFrame(() => {
        q = 0;
        const g = typeof groupOf === 'function' ? groupOf(PAGE) : '';
        const today = (PAGE === 'lit') || ((PAGE === 'atlas' || PAGE === 'blitz') && (!ARG || ARG === 'today'));
        if (BOTG[g] && today && !el.querySelector(':scope > .pl-bot')) { try { botTop(el, true); } catch (e) { /* the page still works */ } }
        if (!el.querySelector(':scope > .pl-toc') && !TOC_SKIP.has(PAGE)) { try { toc(el); } catch (e) { /* optional */ } }   // a page that redrew itself
        // the critical-alert banner (alerts.js) can land after the page: the status bar and the header dot follow it
        const ban = !!document.getElementById('apBan');
        if (ban !== el.__plBan) { el.__plBan = ban; try { refreshBar(); headerDot(); } catch (e) { /* optional */ } }
      });
    });
    el.__plObs.observe(el, { childList: true });
  }

  // ------------------------------------------------------------------ every page: the page / bot on <html>, entrances, count-ups
  const r0 = typeof render === 'function' ? render : null;
  if (r0 && !r0.__pl) {
    render = function (soft) { // eslint-disable-line no-global-assign
      const root = document.documentElement, g = typeof groupOf === 'function' ? groupOf(PAGE) : '';
      root.dataset.page = PAGE || ''; root.dataset.bot = BOTG[g] || '';
      const el = document.getElementById('page');
      if (el && !soft) {
        const ORD = ['today', 'lit', 'atlas', 'blitz', 'money', 'system'], a = ORD.indexOf(render.__g), b = ORD.indexOf(g);
        el.dataset.dir = a >= 0 && b >= 0 && a !== b ? (b > a ? 'r' : 'l') : 'u';
        render.__g = g;
      }
      if (el && PAGE !== 'today') el.classList.remove('pl-h', 'pl-all');
      const out = r0.apply(this, arguments);
      try { if (el) { botTop(el, soft); if (!soft && !NO_ENTER.has(PAGE)) enter(el, ':scope > *'); eyebrow(el, g); tabStops(el); } tabInd(); refreshBar(); headerDot(); } catch (e) { console.warn('polish render', e); }
      try { const t = document.getElementById('title'); if (t) t.classList.toggle('pl-long', (t.textContent || '').trim().length > 11); } catch (e) { /* header only */ }
      try {                                  // the page's cards land over the next second (fetches): build the chips now and once more
        if (el) { toc(el); const p0 = PAGE; clearTimeout(render.__toc); render.__toc = setTimeout(() => { if (PAGE === p0) toc(el); }, 1600); }
      } catch (e) { /* optional */ }
      return out;
    };
    render.__pl = true;
  }
  // long pages: "On this page" chips under the section bar, one per card heading; a tap scrolls to it
  const TOC_SKIP = new Set(['today', 'system', 'liveview', 'holo', 'realtoday']);
  function toc(el) {
    el.querySelectorAll(':scope > .pl-toc').forEach((x) => x.remove());
    if (!el || TOC_SKIP.has(PAGE) || document.documentElement.scrollHeight < innerHeight * 3) return;
    const W = el.clientWidth, seen = new Set(), H = [];
    for (const h of el.querySelectorAll('h3')) {
      if (H.length >= 14 || h.closest('.pl-bot, .su-bar, details:not([open]), .sheet-wrap')) continue;
      const card = h.closest('.card, section, [class*="-card"], [class*="card "]') || h.parentElement;
      if (!card || card.offsetParent === null || card.getBoundingClientRect().width < W * 0.6) continue;
      const first = card.querySelector('h3'); if (first !== h) continue;      // one chip per card: its first heading
      let t = (h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent).replace(/\s+/g, ' ').trim().replace(/[·:]\s*$/, '');
      t = t.replace(/^(Zlarior|ATLAS|BLITZ)\s*·\s*/i, '');       // on a bot's tab its name is already everywhere
      t = t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
      if (!t || t.length < 3 || seen.has(t)) continue;
      seen.add(t); H.push([t.length > 26 ? t.slice(0, 25) + '…' : t, h]);
    }
    if (H.length < 5) return;
    const box = document.createElement('nav'); box.className = 'pl-toc'; box.setAttribute('aria-label', 'On this page');
    box.innerHTML = `<span class="pl-h3">On this page</span><div class="pl-chips">${H.map(([t], i) => `<button type="button" data-toc="${i}">${esc(t)}</button>`).join('')}</div>`;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-toc]'); if (!b) return;
      const h = H[+b.dataset.toc][1]; if (!h || !h.isConnected) return;
      const top = h.getBoundingClientRect().top + scrollY - ((document.querySelector('header.top')?.offsetHeight || 0) + (document.getElementById('sub')?.offsetHeight || 0) + 12);
      scrollTo({ top, behavior: calm() ? 'auto' : 'smooth' });
    });
    const at = [...el.children].filter((c) => c.matches('.mo-strip, .pl-bot')).pop();
    if (at) at.after(box); else el.prepend(box);
  }
  // keyboard: an <a data-go> without href is no tab stop by itself; give it one, Enter / Space opens it (read-only links)
  function tabStops(root) { root.querySelectorAll('a[data-go]:not([href]):not([tabindex])').forEach((a) => { a.tabIndex = 0; if (!a.getAttribute('role')) a.setAttribute('role', 'link'); }); }
  addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const a = e.target && e.target.closest && e.target.closest('a[data-go]:not([href])');
    if (a) { e.preventDefault(); a.click(); }
  });
  // the bottom bar: one glass pill slides to the open tab, in that tab's colour (Zlarior blue, ATLAS orange, BLITZ purple)
  function tabInd() {
    const T = document.getElementById('tabs'); if (!T || getComputedStyle(T).display === 'none') return;     // (a fixed bar has no offsetParent)
    let i = T.querySelector(':scope > .pl-tabind');
    if (!i) { i = document.createElement('i'); i.className = 'pl-tabind'; i.setAttribute('aria-hidden', 'true'); T.prepend(i); }
    let a = T.querySelector('a.on');
    // a late nav() (mission.js / blitz.js redraw the bar once they load) leaves no tab lit: light the page's own tab again
    if (!a && typeof PAGE !== 'undefined' && PAGE && typeof groupOf === 'function') { a = T.querySelector(`a[data-t="${groupOf(PAGE)}"]`); if (a) a.classList.add('on'); }
    T.classList.toggle('pl-slide', !!a);
    if (!a) { i.style.opacity = '0'; return; }
    i.dataset.t = a.dataset.t || '';
    const put = () => { const b = T.querySelector('a.on') || a; i.style.width = b.offsetWidth + 'px'; i.style.transform = `translate3d(${b.offsetLeft}px,0,0)`; i.style.opacity = '1'; };
    put();
    clearTimeout(tabInd.__t); tabInd.__t = setTimeout(put, 380);       // once more after the page settles (fonts, a late redraw of the bar)
    if (!tabInd.__ro && typeof ResizeObserver !== 'undefined') { tabInd.__ro = new ResizeObserver(() => requestAnimationFrame(put)); tabInd.__ro.observe(T); }
    botDots(T);
  }
  // a small light on each bot's tab: green = in a trade (pulsing), amber = armed, red = blocked; nothing while it waits
  function botDots(T) {
    let As = [];
    try { const M = model(); As = M.board && window.MissionUI ? window.MissionUI.accounts(M) : []; } catch (e) { As = []; }
    for (const k of ['lit', 'atlas', 'blitz']) {
      const a = T.querySelector(`a[data-t="${k}"]`); if (!a) continue;
      const A = As.find((x) => x.key === k);
      const st = !A || A.placeholder ? '' : A.pos ? 'trade' : A.blocks && A.blocks.length ? 'blocked' : A.armed ? 'armed' : '';
      let d = a.querySelector(':scope > .pl-tdot');
      if (!st) { if (d) d.remove(); continue; }
      if (!d) { d = document.createElement('i'); d.className = 'pl-tdot'; d.setAttribute('aria-hidden', 'true'); a.appendChild(d); }
      d.dataset.s = st;
      a.setAttribute('aria-label', `${a.textContent.trim()}: ${st === 'trade' ? 'in a trade' : st}`);
    }
  }
  addEventListener('resize', () => requestAnimationFrame(tabInd), { passive: true });
  (function watchTabs() {          // the bar is rebuilt by nav() (another module loading): put the pill back on the open tab
    const T = document.getElementById('tabs'); if (!T || typeof MutationObserver === 'undefined') return;
    let q = 0;
    new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { tabInd(); } catch (e) { /* optional */ } }); }).observe(T, { childList: true });
  })();
  window.POLISH.tabInd = tabInd;
  const PLAN = new Set(['money', 'props', 'whatif', 'scale', 'share']);
  function eyebrow(el, g) {
    const e = el.querySelector(':scope > .hero .eyebrow'); if (!e) return;
    const t = (e.textContent || '').trim();
    if (BOTG[g]) {
      const seg = (document.querySelector('#sub .zl-seg button.on') || {}).textContent || '';
      const nm = SU.NAME[g === 'lit' ? 'lit' : g];
      if (seg && /^(Money|System|Today|Trades|Lab)\b/i.test(t)) e.textContent = `${nm} · ${seg.trim()}`;
    } else if (PLAN.has(PAGE) && /^Money\b/.test(t)) e.textContent = t.replace(/^Money\b/, 'Money planning');
  }
  // card entrances: the first 10 visible children rise in, 40 ms apart (a class, so nothing is left half-drawn)
  function enter(root, sel) {
    if (calm() || !root) return;
    const L = [...root.querySelectorAll(sel)].filter((c) => c.offsetParent !== null).slice(0, 10);
    L.forEach((c, i) => { c.classList.remove('pl-in'); c.style.setProperty('--d', (i * 40) + 'ms'); void c.offsetWidth; c.classList.add('pl-in'); });
    setTimeout(() => L.forEach((c) => { c.classList.remove('pl-in'); c.style.removeProperty('--d'); }), 900);
  }
  // count-ups: $ numbers roll up from 0 on the first paint (600 ms, ease-out), the final text is the real one
  function countUp(root) {
    if (calm()) return;
    root.querySelectorAll('[data-su-count]').forEach((e) => {
      const v = +e.dataset.suCount; if (!e.dataset.suCount || !okN(v) || v === 0) return;
      const fin = e.textContent, t0 = performance.now(), D_ = 650;
      const f = (t) => { const k = Math.min(1, (t - t0) / D_), x = 1 - Math.pow(1 - k, 3); e.textContent = k < 1 ? '$' + Math.round(v * x).toLocaleString('en-US') : fin; if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
  }

  // ------------------------------------------------------------------ the command palette
  const SECS = { lit: [['Today', 'lit'], ['Brain', 'brain'], ['Trades', 'trades'], ['Results', 'perf'], ['Rules', 'strategy']],
    atlas: [['Today', 'atlas'], ['Brain', 'atlas/brain'], ['Trades', 'atlas/trades'], ['Results', 'atlas/results'], ['Rules', 'atlas/setups']],
    blitz: [['Today', 'blitz'], ['Brain', 'blitz/brain'], ['Trades', 'blitz/trades'], ['Results', 'blitz/results'], ['Rules', 'blitz/rules']] };
  function palItems() {
    const out = [], seen = new Set();
    for (const [b, L] of Object.entries(SECS)) for (const [s, id] of L) { out.push({ id, t: `${SU.NAME[b]} · ${s}`, d: `${SU.NAME[b]}'s ${s.toLowerCase()}`, k: 'bot', bot: b }); seen.add(id); }
    for (const id of Object.keys(PAGES)) {
      const p = PAGES[id]; if (!p || seen.has(id)) continue;
      const G = (typeof GROUPS !== 'undefined' ? GROUPS : []).find((g) => g.id === p.group);
      out.push({ id, t: p.label, d: p.desc || '', g: G ? G.label : '', k: 'page' });
    }
    // live numbers: the answer itself, one tap to its page
    try {
      const M = model(), As = window.MissionUI.accounts(M) || [];
      for (const A of As) {
        if (A.placeholder) { out.unshift({ id: 'blitz', t: 'BLITZ: paper only', d: 'off until its own 25K', k: 'num', bot: 'blitz' }); continue; }
        if (okN(A.toTarget)) out.unshift({ id: A.key === 'lit' ? 'lit' : A.key, t: `${A.name}: $${Math.round(A.toTarget).toLocaleString('en-US')} to the target`, d: `room $${Math.round(A.room || 0).toLocaleString('en-US')} · today ${okN(A.today) ? (A.today >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(A.today)) : '—'}`, k: 'num', bot: A.key });
      }
    } catch (e) { /* numbers are optional */ }
    return out;
  }
  const norm = (s) => String(s || '').toLowerCase();
  function score(it, q) {
    if (!q) return 1;
    const t = norm(it.t), d = norm(it.d + ' ' + (it.g || '') + ' ' + it.id);
    if (t.startsWith(q)) return 100; if (t.includes(q)) return 60;
    const W = q.split(/\s+/).filter(Boolean);                          // every word somewhere ("atlas trades", "eval timeline")
    if (W.length > 1 && W.every((w) => t.includes(w))) return 80; if (W.length > 1 && W.every((w) => (t + ' ' + d).includes(w))) return 40;
    if (d.includes(q)) return 30;
    let i = 0; for (const ch of t) if (ch === q[i]) i++; return i === q.length ? 10 : 0;   // the letters in order
  }
  function palette(open) {
    let P = document.getElementById('plPal');
    if (!open) { if (P) { P.classList.remove('on'); setTimeout(() => P && !P.classList.contains('on') && P.remove(), 220); } return; }
    if (P) return;
    P = document.createElement('div'); P.id = 'plPal'; P.className = 'pl-pal'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Search');
    P.innerHTML = `<div class="pl-pal-bg" data-pl-x></div><div class="pl-pal-in"><label class="pl-pal-q">${ic('search')}<input id="plQ" type="search" placeholder="Search pages, bots, numbers" autocomplete="off" enterkeyhint="go" aria-label="Search"><button type="button" class="pl-pal-x" data-pl-x>Close</button></label><ul class="pl-pal-l" id="plL" role="listbox"></ul></div>`;
    document.body.appendChild(P);
    const inp = P.querySelector('#plQ'), L = P.querySelector('#plL'), items = palItems();
    let sel = 0, cur = [];
    const recent = () => { try { return (store.get('pl.recent', []) || []).slice(0, 5); } catch (e) { return []; } };
    const draw = () => {
      const q = norm(inp.value.trim());
      if (!q) { const R = recent(); cur = R.map((id) => items.find((x) => x.id === id)).filter(Boolean).concat(items.filter((x) => x.k === 'num' || x.k === 'bot').slice(0, 12)); }
      else cur = items.map((x) => [score(x, q), x]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 30).map((x) => x[1]);
      const uniq = []; const u = new Set(); for (const x of cur) { const key = x.id + '|' + x.t; if (!u.has(key)) { u.add(key); uniq.push(x); } } cur = uniq;
      sel = Math.min(sel, Math.max(0, cur.length - 1));
      L.innerHTML = cur.length ? cur.map((x, i) => `<li role="option" aria-selected="${i === sel}" class="${i === sel ? 'on' : ''}" data-i="${i}"${x.bot ? ` style="--c:${SU.COLOR[x.bot]}"` : ''}><i class="pl-pal-k ${x.k}"></i><span><b>${esc(x.t)}</b><em>${esc(x.d || x.g || '')}</em></span></li>`).join('')
        : '<li class="pl-pal-none"><span><b>No match</b><em>Try “eval”, “trades”, “news” or a bot name</em></span></li>';
    };
    const go = (x) => { if (!x) return; try { const R = recent().filter((id) => id !== x.id); R.unshift(x.id); store.set('pl.recent', R.slice(0, 8)); } catch (e) { /* private */ } palette(false); location.hash = '#/' + x.id; };
    inp.oninput = () => { sel = 0; draw(); };
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(cur.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { go(cur[sel]); e.preventDefault(); }
      else if (e.key === 'Escape') palette(false);
    };
    P.addEventListener('click', (e) => { if (e.target.closest('[data-pl-x]')) { palette(false); return; } const li = e.target.closest('li[data-i]'); if (li) go(cur[+li.dataset.i]); });
    draw();
    requestAnimationFrame(() => { P.classList.add('on'); inp.focus({ preventScroll: true }); });
  }
  window.POLISH.palette = palette;
  // the header: one status dot on every page (green / amber / red = the status bar's verdict); a tap opens it on Home
  function headerDot() {
    const ref = document.getElementById('plFind'); if (!ref) return;
    let b = document.getElementById('plStat');
    if (!b) {
      b = document.createElement('button'); b.id = 'plStat'; b.type = 'button'; b.className = 'iconbtn pl-stat';
      b.onclick = () => { try { localStorage.setItem('le.st.open', '1'); } catch (e) { /* private */ } if (typeof PAGE !== 'undefined' && PAGE === 'today' && typeof render === 'function') render(true); else location.hash = '#/today'; };
      ref.before(b);
    }
    let S = null; try { const M = model(); if (M.board) S = SU.summary(M); } catch (e) { S = null; }
    const lvl = S ? S.lvl : 'idle';
    b.className = 'iconbtn pl-stat ' + lvl;
    b.title = S ? `${S.title} · ${S.why}` : 'Status: waiting for the first report';
    b.setAttribute('aria-label', 'Status: ' + (S ? S.title : 'waiting for the first report'));
    b.innerHTML = `<i class="su-dot ${lvl}${lvl === 'good' ? ' live' : ''}"></i>`;
  }
  window.POLISH.headerDot = headerDot;
  function headerButton() {
    const top = document.querySelector('header.top'), ref = document.getElementById('refresh');
    if (!top || !ref || document.getElementById('plFind')) return;
    const b = document.createElement('button'); b.id = 'plFind'; b.type = 'button'; b.className = 'iconbtn'; b.title = 'Search'; b.setAttribute('aria-label', 'Search every page');
    b.innerHTML = ic('search'); b.onclick = () => palette(true);
    ref.before(b);
  }
  addEventListener('keydown', (e) => {
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); palette(true); }
  });

  // More: the pages you opened last, as chips under the search box (from the palette's picks and your visits)
  addEventListener('hashchange', () => {
    try {
      const id = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
      if (!id || id === 'system' || id === 'today' || !PAGES[id]) return;
      const R = (store.get('pl.visits', []) || []).filter((x) => x !== id); R.unshift(id); store.set('pl.visits', R.slice(0, 8));
    } catch (e) { /* private window */ }
  });
  const m0 = VIEWS.system;
  if (m0 && !m0.__pl) {
    const w = function (el) {
      m0.apply(this, arguments);
      try {
        const R = (store.get('pl.visits', []) || []).filter((id) => PAGES[id]).slice(0, 6);
        if (!R.length) return;
        const box = document.createElement('div'); box.className = 'pl-recent';
        box.innerHTML = `<span class="pl-h3">Recent</span><div class="pl-chips">${R.map((id) => `<a data-go="${esc(id)}">${esc(PAGES[id].label)}</a>`).join('')}</div>`;
        const s = el.querySelector('.cl-search'); if (s) s.after(box); else el.prepend(box);
      } catch (e) { /* optional */ }
    };
    Object.keys(m0).forEach((k) => { w[k] = m0[k]; }); w.__pl = true; VIEWS.system = w;
  }

  // ------------------------------------------------------------------ the sky: a little parallax with scroll and tilt
  function sky() {
    const S = document.querySelector('.space-css'); if (!S || calm()) return;
    let tx = 0, ty = 0, sy = 0, raf = 0;
    const put = () => {
      raf = 0;
      S.style.setProperty('--px', tx.toFixed(2)); S.style.setProperty('--py', (ty + sy).toFixed(2));
      const F = typeof FX !== 'undefined' ? FX : null; if (F && typeof F.parallax === 'function') F.parallax(tx / 12, (ty + sy) / 12);
    };
    const q = () => { if (!raf) raf = requestAnimationFrame(put); };
    addEventListener('scroll', () => { sy = Math.max(-12, -scrollY / 60); q(); }, { passive: true });
    addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; tx = Math.max(-10, Math.min(10, e.gamma / 4)); ty = Math.max(-10, Math.min(10, (e.beta - 45) / 6)); q(); }, { passive: true });
    addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; tx = (e.clientX / innerWidth - 0.5) * 12; ty = (e.clientY / innerHeight - 0.5) * 8; q(); }, { passive: true });
  }

  // ------------------------------------------------------------------ the intro line (index.html draws the intro itself)
  function introLine() {
    const el = document.getElementById('spLine'); if (!el) return;
    try {
      const M0 = model(); if (!M0.board) return;
      const S = SU.summary(M0), h = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false });
      const hi = +h < 12 ? 'Good morning' : +h < 18 ? 'Good afternoon' : 'Good evening';
      el.innerHTML = `<b>${hi}.</b> ${esc(S.title)}${S.next ? ' · ' + esc(S.next.label.toLowerCase()) + ' ' + esc(S.next.value) : ''}`;
      el.classList.add('on'); el.dataset.lvl = S.lvl;
    } catch (e) { /* the intro shows without it */ }
  }
  window.POLISH.introLine = introLine;
  setInterval(() => {
    const e = document.querySelector('[data-pl-clock]'); if (!e || document.hidden) return;
    try { e.textContent = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (er) { /* static */ }
  }, 15000);

  // ------------------------------------------------------------------ Money = real money only
  // Real results first, then "Accounts today" (the real-account cards Home used to show in full) and the eval timeline;
  // the research $ pages (Money plan, prop firms, what-if, scale, accounts) move to More and keep their links.
  function viewRealToday(el) {
    el.innerHTML = head('Money · real', 'Accounts today', 'Both real MFFU accounts right now: today\'s real trades, balance, room to the floor, $ to the target, daily loss, and the safety lights. NinjaTrader fills only, never paper $.')
      + '<div class="rc-host"><div class="skel" style="height:240px"></div></div>';
    const RP = window.RealPages || {};
    const draw = () => {
      const r = el.querySelector('.rc-host'); if (!r || !window.RealUI) return;
      const B = RP.board ? RP.board() : board(), o = RP.opts ? RP.opts() : { where: 'phone', go: (id) => `data-go="${id}"` };
      r.innerHTML = B ? window.RealUI.today(B, o) + window.RealUI.safety(B, o) : SU.empty('real', model());
      try { window.RealUI.wire(r, B, o); } catch (e) { /* static */ }
    };
    if (RP.core) RP.core(draw); else draw();
  }
  function moneyTab() {
    const Mo = GROUPS.find((g) => g.id === 'money'), Sy = GROUPS.find((g) => g.id === 'system');
    if (!Mo || !Sy) return;
    const desc = 'Both real MFFU accounts today: balance, room, $ to the target, daily loss, safety (real $ only)';
    PAGES.realtoday = { id: 'realtoday', label: 'Accounts today', icon: 'wallet', desc, group: 'money' };
    VIEWS.realtoday = viewRealToday;
    if (!Mo.pages.some((p) => p[0] === 'realtoday')) Mo.pages.push(['realtoday', 'Accounts today', 'wallet', desc]);
    const keep = ['real', 'realtoday', 'evaltl'];
    Mo.pages = Mo.pages.filter((p) => {
      if (keep.includes(p[0])) return true;
      if (PAGES[p[0]]) PAGES[p[0]].group = 'system';
      if (!Sy.pages.some((q) => q[0] === p[0])) Sy.pages.push(p);
      return false;
    });
    Mo.pages.sort((a, b) => keep.indexOf(a[0]) - keep.indexOf(b[0]));
    if (typeof SCENE !== 'undefined') SCENE.realtoday = 'results';
    if (PAGES.money) PAGES.money.label = 'Money plan';     // the research $ / month, goal and funded plan (the tab is "Money")
    if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { accountstoday: 'realtoday', realnow: 'realtoday', today_real: 'realtoday' });
  }

  // ------------------------------------------------------------------ More > All features: tonight's features, marked new
  function whatsNew() {
    const FL = window.Features && Array.isArray(window.Features.list) ? window.Features.list : null;
    const G = 'Calm & clear (Oct 30)';
    if (!FL || FL.some((f) => f.group === G)) return;
    [['today', 'Status bar', 'One line on top of Home says if everything is OK right now (PC, NinjaTrader, feed, each bot, the next window, alerts); a tap opens every line with its fix'],
      ['today', 'The three accounts', 'Zlarior, ATLAS and BLITZ as one card each: eval ring, $ to the target, room, today\'s real $, a sparkline, the day in one line'],
      ['today', 'What matters now', 'Open trades, since you last looked, the next window, the next big news, the last real trade'],
      ['today', 'NQ now', 'The price between its nearest levels, with the VIX band'],
      ['today', 'This week', 'Real trades against each bot\'s goal, Mon-Fri'],
      ['today', 'Sunday open', 'Weekends: the CME reopen, the clock change, what each bot does first'],
      ['lit', 'One order on every bot', 'Today · Brain · Trades · Results · Rules on Zlarior, ATLAS and BLITZ, with "why no trade yet" under the account card'],
      ['real', 'Money = real money', 'Real results · Accounts today · Eval timeline; the research $ pages are under More > Money planning'],
      ['system', 'Search everything', 'The magnifier in the header (or "/"): pages, each bot\'s sections and the live numbers'],
      ['settings', 'Motion and intro', 'Smooth page and tab transitions, a short intro once a day (Skip), all off with Settings > Motion or reduced motion'],
    ].reverse().forEach(([go, name, line]) => FL.unshift({ group: G, name, line: line + '.', go, isNew: true }));
    window.Features.count = FL.length; window.Features.newCount = FL.filter((f) => f.isNew).length;
  }

  // ------------------------------------------------------------------ Settings: the intro on / off (this device)
  const s0 = VIEWS.settings;
  if (s0 && !s0.__pl) {
    const w = function (el) {
      s0.apply(this, arguments);
      try {
        el.insertAdjacentHTML('beforeend', `<div class="card"><div class="card-h"><h3>${ic('star')}Intro</h3></div><label class="row"><span><b>Intro on the first open of the day</b><span class="small mut">A two-second space intro with today's status line, at most once a day; tap Skip any time. Never with Motion off or reduced motion.</span></span><input type="checkbox" class="switch" id="plIntro" ${store.get('intro', true) !== false ? 'checked' : ''}></label></div>`);
        el.querySelector('#plIntro').onchange = (e) => store.set('intro', !!e.target.checked);
      } catch (e) { console.warn('settings intro', e); }
    };
    Object.keys(s0).forEach((k) => { w[k] = s0[k]; }); w.__pl = true; VIEWS.settings = w;
  }

  // ------------------------------------------------------------------ install
  function install() {
    try { whatsNew(); } catch (e) { /* the list is optional */ }
    try { moneyTab(); } catch (e) { console.warn('polish money', e); }
    // one icon per page in More: the Holodeck (3D layers) no longer shares Live View's chart icon, Full overview gets the archive
    try { if (PAGES.holo) PAGES.holo.icon = 'layers'; if (PAGES.homefull) PAGES.homefull.icon = 'archive'; } catch (e) { /* icons only */ }
    keepBotTop();
    if (typeof nav === 'function') nav();
    headerButton();
    sky();
    document.documentElement.dataset.polish = 'on';
    introLine();
    if (typeof render === 'function' && typeof PAGE !== 'undefined' && PAGE && HD()) render(true);
  }
  install();
})();
