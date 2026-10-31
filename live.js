// Live data from the PC, laid over data.json (engine/live_publish.py, owner 2026-10-21: "everything needs to refresh").
// The PC pushes live.json (the Home essentials: verdict, account, position, today's P&L, eval $ to go / room / session,
// feed ages, health, last check-in) to the branch `live` of this site's public repo every 60 s while the bot runs (5 min
// otherwise). data.json comes from the cloud monitor every ~30 min in the session, nothing overnight.
// This file polls live.json every 30-60 s while the app is open and visible (and at once on focus): first GitHub's API
// (fresh within ~60 s, 60 calls an hour per network without a login), then raw.githubusercontent.com (may be up to
// ~5 min behind) when the API's limit is used up. Always network-only (cross-origin: the service worker never caches it).
// It merges live.json into data.json's live.pc / live.pc_verdict / accounts (only when newer), so Home, Trades > Accounts
// and Money show it, and redraws those pages. window.LIVE.apply(X) is called by index.html after every data.json load.
// Classic script loaded after hub.js; uses the main page's globals (D, PAGE, render, $, openDD). Read-only.
(function () {
  'use strict';
  const host = location.hostname, seg = location.pathname.split('/').filter(Boolean)[0];
  const OWNER = /\.github\.io$/.test(host) ? host.split('.')[0] : 'demetrades2000-coder';
  const REPO = /\.github\.io$/.test(host) && seg && !/\./.test(seg) ? seg : 'nq-dashboard';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/live.json?ref=live`;
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/live/live.json`;
  const FRESH_S = 20 * 60;                 // live.json older than this no longer overrides the verdict (the cloud's own rule)
  const LIVE = window.LIVE = { j: null, at: 0, src: null, err: null, apiUntil: 0, every: 45, busy: false, polls: 0 };
  const nowS = () => Date.now() / 1000;
  const okN = (v) => typeof v === 'number' && Number.isFinite(v);
  LIVE.age = () => (LIVE.j && okN(+LIVE.j.t) ? Math.max(0, nowS() - LIVE.j.t) : null);
  LIVE.fresh = () => { const a = LIVE.age(); return a != null && a < FRESH_S; };

  function inSession(ts = nowS()) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date(ts * 1000));
    const g = (k) => (p.find((x) => x.type === k) || {}).value, h = +g('hour') % 24, m = +g('minute'), wd = g('weekday');
    return !['Sat', 'Sun'].includes(wd) && h * 60 + m >= 110 && h * 60 + m <= 955;
  }
  function mergeTrades(a, b) {          // union by entry time, newest last
    const m = new Map();
    for (const t of [...(a || []), ...(b || [])]) if (t) m.set(String(t.entry_t || t.time || '') + '|' + (t.day || ''), t);
    return [...m.values()].sort((x, y) => (+x.entry_t || 0) - (+y.entry_t || 0));
  }

  // lay live.json over a data.json / home.json object (in place). Only parts newer than what X already has.
  LIVE.apply = function (X) {
    const j = LIVE.j;
    if (!X || !j || !okN(+j.t)) return X;
    X.live = X.live || {};
    const pc0 = X.live.pc || {}, age = nowS() - j.t;
    if (+j.t >= (+pc0.t || 0)) {
      X.live.pc = { ...pc0, ...(j.pc || {}), present: true, t: j.t, age_s: Math.round(age), live: true };
      if (age < FRESH_S && j.pc_verdict) X.live.pc_verdict = j.pc_verdict;
      else if (j.pc && j.pc.running && inSession()) {
        X.live.pc_verdict = { code: 'SILENT', label: 'PC SILENT', level: 'bad', in_session: true, hb_age_s: Math.round(age), t: Math.round(nowS()),
          reason: `no check-in from the PC for ${Math.round(age / 60)} min (its live feed); the bot said it was running` };
        X.live.pc.silent = true;
      }
      if (age < FRESH_S && okN(+j.price)) X.live.price = +j.price;
    }
    if (Array.isArray(j.accounts)) {
      const L = Array.isArray(X.accounts) ? X.accounts : (X.accounts = []);
      for (const a of j.accounts) {
        if (!a || !a.id) continue;
        const i = L.findIndex((x) => x && x.id === a.id);
        if (i < 0) { L.unshift(a); continue; }
        const o = L[i];
        if ((+(a.conn || {}).t || 0) < (+(o.conn || {}).t || 0)) continue;
        L[i] = { ...o, ...a, trades: mergeTrades(o.trades, a.trades), days: (a.days || []).length >= (o.days || []).length ? a.days : o.days, live: true };
      }
    }
    return X;
  };

  async function get(url, opts) { const r = await fetch(url, opts); if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; e.r = r; throw e; } return r; }
  async function fetchLive() {
    let r = null, src = 'api';
    if (Date.now() >= LIVE.apiUntil) {
      try {
        r = await get(API, { cache: 'no-cache', headers: { Accept: 'application/vnd.github.raw+json' } });
        const rem = +r.headers.get('x-ratelimit-remaining'), reset = +r.headers.get('x-ratelimit-reset');
        if (okN(rem)) { LIVE.every = rem > 30 ? 30 : 60; if (rem <= 2) LIVE.apiUntil = (okN(reset) && reset > 0 ? reset * 1000 : Date.now() + 15 * 60e3); }
      } catch (e) {
        r = null;
        const h = e.r && e.r.headers, reset = h ? +h.get('x-ratelimit-reset') : NaN;
        if (e.status === 403 || e.status === 429 || !e.status) LIVE.apiUntil = okN(reset) && reset > 0 ? reset * 1000 : Date.now() + 15 * 60e3;
        else if (e.status === 404) LIVE.apiUntil = Date.now() + 10 * 60e3;   // no live branch yet (the PC has not pushed)
      }
    }
    if (!r) { src = 'raw'; r = await get(RAW + '?t=' + Date.now(), { cache: 'no-store' }); }
    let j = await r.json();
    if (j && j.encoding === 'base64' && typeof j.content === 'string') {     // the API ignored the raw Accept header
      const bin = atob(j.content.replace(/\s/g, '')), u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      j = JSON.parse(new TextDecoder().decode(u8));
    }
    if (!j || j.kind !== 'le-live' || !okN(+j.t)) throw new Error('not a live.json');
    return { j, src };
  }
  const LIVE_PAGES = ['today', 'accounts', 'money', 'whatif', 'live', 'cockpit', 'trades', 'brain'];
  function redraw() {
    try {
      if (typeof D === 'undefined') return;
      if (D) LIVE.apply(D);
      if (window.HOMEJ) LIVE.apply(window.HOMEJ);
      if (document.hidden || (typeof openDD !== 'undefined' && openDD) || document.querySelector('.sheet-wrap')) return;
      if (typeof PAGE !== 'undefined' && LIVE_PAGES.includes(PAGE) && (D || (PAGE === 'today' && window.HOMEJ)) && typeof render === 'function') render(true);
    } catch (e) { console.warn('live redraw', e); }
  }
  LIVE.poll = async function (force) {
    if (LIVE.busy || (!force && document.hidden)) return;
    // the Live View page (liveview.js) polls its own liveview.json from the same API: live.json waits ~3 min there
    if (!force && typeof PAGE !== 'undefined' && PAGE === 'liveview' && Date.now() - LIVE.at < 170e3) return;
    LIVE.busy = true;
    try {
      const { j, src } = await fetchLive();
      const changed = !LIVE.j || j.t !== LIVE.j.t;
      LIVE.j = j; LIVE.at = Date.now(); LIVE.src = src; LIVE.err = null; LIVE.polls++;
      if (changed) redraw();
    } catch (e) { LIVE.err = e.message || String(e); }
    finally { LIVE.busy = false; chip(); }
  };

  // the header chip next to the cloud status: "live · 12 s ago" (green < 3 min, amber < 20 min, else hidden)
  function chip() {
    const st = document.getElementById('status'); if (!st) return;
    let el = document.getElementById('liveChip');
    const a = LIVE.age();
    if (a == null || a > FRESH_S) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('span'); el.id = 'liveChip'; el.className = 'status live-chip'; st.after(el); }
    const txt = a < 90 ? Math.round(a) + ' s' : Math.round(a / 60) + ' min';
    el.innerHTML = `<span class="dot ${a < 180 ? '' : 'warn'}"></span><span class="lbl">live · </span>${txt} ago`;
    el.title = `From the PC (${LIVE.j.host || 'Surface'}) via ${LIVE.src === 'raw' ? 'raw.githubusercontent.com' : 'the GitHub API'}; checked ${new Date(LIVE.at).toLocaleTimeString()}`;
  }
  const css = document.createElement('style');
  css.textContent = '.live-chip{margin-left:6px}.live-chip .dot{background:var(--good)}.live-chip .dot.warn{background:var(--warn)}';
  document.head.appendChild(css);

  let timer = null;
  function loop() { clearTimeout(timer); timer = setTimeout(async () => { await LIVE.poll(); loop(); }, LIVE.every * 1000); }
  let lastFocus = 0;
  const onFocus = () => { if (document.hidden || Date.now() - lastFocus < 10000) return; lastFocus = Date.now(); LIVE.poll(true).then(loop); };
  document.addEventListener('visibilitychange', onFocus);
  addEventListener('focus', onFocus);
  addEventListener('pageshow', onFocus);
  setInterval(chip, 5000);
  // the refresh button, pull to refresh and the "Updated" line call load(true): fetch live.json too
  if (typeof window.load === 'function') {
    const l0 = window.load;
    window.load = function (manual) { if (manual === true) LIVE.poll(true); return l0.apply(this, arguments); };
  }
  LIVE.poll(true).then(loop);
})();
